/* ===========================================================
   tenon.table.js — 数据表格（排序 / 分页 / 勾选 / 过滤）
   -----------------------------------------------------------
   声明方式：

     <table class="table table-hover" tn-data="table" data-page-size="8">
       <thead><tr>
         <th><input type="checkbox" data-check-all></th>
         <th class="th-sort" data-sort="name">姓名 <span class="th-arrow">⇅</span></th>
       </tr></thead>
       <tbody>
         <tr data-row-id="1"><td><input type="checkbox" data-check="1"></td><td>张三</td></tr>
       </tbody>
     </table>
     <div data-pager></div>

   数据来源就是 <tbody> 里已渲染的行（等价于服务端输出），
   控件只做客户端增强：排序、切页、全选、按文本过滤、列宽拖拽。
   增删行走实例 API，不依赖任何全局数据源。

   列宽拖拽默认开启，列头右缘会多一根把手（kit 造的 colResizer）。
   不想要就写 data-resize="off"；拖完派发 tenon:table-resize。

   虚拟滚动：data-virtual
     上千行只渲染可视窗口，靠上下两根占位行撑出总高度。
     需要外层容器有固定高度并 overflow-y:auto（否则退回整表渲染）。
     开了虚拟滚动就别再写 data-page-size，两者互斥。

   固定表头 / 固定列：data-sticky="head,1"
     head  —— 表头吸顶（外层容器需要有高度并 overflow:auto）
     数字 N —— 前 N 列吸附到左侧
   框架负责算每列的 left 偏移（拖完列宽会重算），长相交给皮肤。
   =========================================================== */
Tenon.component("table", {
  selector: 'table[tn-data~="table"]',

  init(table) {
    const { qsa } = Tenon.core;
    const tbody = table.tBodies[0];
    if (!tbody) return null;

    const HEAD = qsa("[data-sort]", table);
    const pageSize = Number(table.dataset.pageSize || 0);

    /** 原始行 HTML + 用于排序/过滤的纯文本 */
    const source = qsa("tr", tbody).map((tr) => ({
      id: tr.dataset.rowId || (tr.querySelector("[data-check]") || {}).dataset?.check || "",
      html: tr.outerHTML,
      text: tr.textContent.replace(/\s+/g, " ").trim(),
      cells: qsa("td", tr).map((td) => td.textContent.trim())
    }));

    let page = 1;
    let sortKey = table.dataset.sortKey || "";
    let dir = table.dataset.sortDir === "desc" ? -1 : 1;
    let filterFn = null;
    let pool = source.slice();   // 过滤后的基线；排序在 render 时叠加，二者互不覆盖

    /* 勾选状态存在这里，不依赖 DOM —— render 会重写 tbody，
       只读 DOM 的写法会让排序/翻页一操作就把选择清空。 */
    const picked = new Set();
    const rowId = (c) => String(c.dataset.check);
    qsa("[data-check]", tbody).forEach((c) => { if (c.checked) picked.add(rowId(c)); });

    /* ---------- 读取某行的排序值 ---------- */
    function cellValue(row, key) {
      const idx = HEAD.findIndex((th) => th.dataset.sort === key);
      if (idx < 0) return "";
      // 有全选框时列序会错开一位，这里按 th 在行内的真实位置取
      const ths = qsa("th", table.tHead ? table.tHead.rows[0] : table);
      const real = ths.indexOf(HEAD[idx]);
      return row.cells[real] == null ? "" : row.cells[real];
    }

    /* ---------- 排序 ---------- */
    function sortRows(list) {
      if (!sortKey) return list;
      const out = list.slice();
      out.sort((a, b) => {
        const va = cellValue(a, sortKey);
        const vb = cellValue(b, sortKey);
        const na = Number(va.replace(/[¥,\s]/g, ""));
        const nb = Number(vb.replace(/[¥,\s]/g, ""));
        const isNum = va !== "" && vb !== "" && !Number.isNaN(na) && !Number.isNaN(nb);
        const r = isNum ? na - nb : String(va).localeCompare(String(vb), "zh");
        return r * dir;
      });
      return out;
    }

    /* ---------- 箭头 ---------- */
    function paintArrows() {
      const ARROW = Tenon.kit.part("sortArrow");
      HEAD.forEach((th) => {
        const on = th.dataset.sort === sortKey;
        /* 没有箭头节点也要标状态：以前这里先 return，导致「排序了但没标记」 */
        const arrow = th.querySelector(ARROW);
        if (arrow) arrow.textContent = on ? (dir === 1 ? "▲" : "▼") : "⇅";
        Tenon.kit.setState(th, "sorted", on);
        th.setAttribute("aria-sort", on ? (dir === 1 ? "ascending" : "descending") : "none");
      });
    }

    /* ---------- 分页容器 ---------- */
    function pagerBox() {
      const sel = table.dataset.pager;
      if (sel) return Tenon.core.qs(sel);
      const wrap = table.closest(Tenon.kit.part("tableWrap")) || table;
      let box = wrap.nextElementSibling;
      if (box && box.matches("[data-pager]")) return box;
      const card = table.closest(Tenon.kit.part("card"));
      return card ? card.querySelector("[data-pager]") : null;
    }

    /* ---------- 虚拟滚动 ---------- */

    let virtualOn = table.hasAttribute("data-virtual") && !pageSize;
    let rowH = 38;            // 先猜一行高，首屏渲染后按实测修正
    let rowMeasured = false;  // 量过一次就不重量（重绘会再触发 render）
    let scroller = null;
    let vRaf = 0;

    /** 往上找真正滚动的祖先；找不到说明整页在滚，虚拟滚动没便宜可占 */
    function scrollParent(el) {
      let p = el.parentElement;
      while (p && p !== document.body && p !== document.documentElement) {
        const oy = getComputedStyle(p).overflowY;
        if (oy === "auto" || oy === "scroll" || oy === "overlay") return p;
        p = p.parentElement;
      }
      return null;
    }

    /** 当前该渲染的窗口 [start, end) */
    function virtualWindow(total) {
      if (!scroller) return { start: 0, end: total };
      const headH = table.tHead ? table.tHead.getBoundingClientRect().height : 0;
      const tableTop = table.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      const viewTop = Math.max(0, scroller.scrollTop - (tableTop + headH));
      const OVER = 6;                                    // 上下各多渲染几行，滚动时不会闪白
      const first = Math.floor(viewTop / rowH) - OVER;
      const count = Math.ceil(scroller.clientHeight / rowH) + OVER * 2;
      const start = Math.max(0, Math.min(first, Math.max(0, total - 1)));
      return { start, end: Math.min(total, start + count) };
    }

    /**
     * 量一次真实行高，跟猜的差得多就按实测值重画。
     * 放在 render 末尾调用：表格可能是 init 后才 setData 塞进数据的，
     * 那时首屏是空表，量不到行 —— 所以「量不到就下次再说」，量到就锁住。
     */
    function measureRow() {
      if (!virtualOn || rowMeasured) return;
      const tr = tbody.querySelector("tr:not([tn-data-spacer])");
      if (!tr) return;
      const h = tr.getBoundingClientRect().height;
      if (h <= 0) return;
      rowMeasured = true;                 // 先置位，避免下面的 render 再进来递归
      if (Math.abs(h - rowH) > 0.5) {
        rowH = h;
        render(true);
      }
    }

    function bindVirtual() {
      if (!virtualOn) return () => {};
      scroller = scrollParent(table);
      if (!scroller) { virtualOn = false; return () => {}; }

      const onScroll = () => {
        if (vRaf) return;
        vRaf = requestAnimationFrame(() => {
          vRaf = 0;
          render(true);          // 静默重绘：滚动不该不停派发 table-change
        });
      };
      scroller.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        scroller.removeEventListener("scroll", onScroll);
        if (vRaf) cancelAnimationFrame(vRaf);
        vRaf = 0;
        scroller = null;
      };
    }

    /* ---------- 渲染 ---------- */

    /** 列数：占位行要跨满整行 */
    const colCount = () => qsa("th", table.tHead ? table.tHead.rows[0] : table).length || 1;

    function spacer(h) {
      return h > 0
        ? `<tr tn-data-spacer><td colspan="${colCount()}" style="height:${Math.round(h)}px;padding:0;border:0"></td></tr>`
        : "";
    }

    function render(silent) {
      const list = sortRows(pool);
      const total = list.length;
      const pages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
      if (page > pages) page = pages;
      const start = pageSize ? (page - 1) * pageSize : 0;

      let rows = pageSize ? list.slice(start, start + pageSize) : list;
      let topPad = 0;
      let botPad = 0;

      if (virtualOn && total) {
        const win = virtualWindow(total);
        rows = list.slice(win.start, win.end);
        topPad = win.start * rowH;
        botPad = (total - win.end) * rowH;
      }

      tbody.innerHTML = rows.length
        ? spacer(topPad) + rows.map((r) => r.html).join("") + spacer(botPad)
        : Tenon.kit.emptyRow(colCount());

      const box = pagerBox();
      if (box && pageSize && total > pageSize) box.innerHTML = Tenon.kit.pager(page, pages, total);
      else if (box) box.innerHTML = total ? Tenon.kit.count(total) : "";

      paintArrows();
      applyPicked();
      syncCheckAll();
      paintSticky();
      measureRow();
      if (silent) return;
      table.dispatchEvent(new CustomEvent("tenon:table-change", {
        bubbles: true, detail: { page, total, pages, rows: rows.length }
      }));
    }

    /* ---------- 勾选 ---------- */

    /** 把 picked 回填到刚重建的行上 */
    function applyPicked() {
      qsa("[data-check]", tbody).forEach((c) => {
        c.checked = picked.has(rowId(c));
      });
    }

    /** 把 DOM 上的勾选收回 picked（全选/单选共用） */
    function collectPicked() {
      qsa("[data-check]", tbody).forEach((c) => {
        if (c.checked) picked.add(rowId(c));
        else picked.delete(rowId(c));
      });
    }

    const selected = () => Array.from(picked);

    function syncCheckAll() {
      const all = table.querySelector("[data-check-all]");
      if (!all) return;
      if (virtualOn) {
        const total = pool.length;
        const on = pool.filter((r) => picked.has(String(r.id))).length;
        all.checked = total > 0 && on === total;
        all.indeterminate = on > 0 && on < total;
        return;
      }
      const boxes = qsa("[data-check]", tbody);
      const on = boxes.filter((c) => c.checked).length;
      all.checked = boxes.length > 0 && on === boxes.length;
      all.indeterminate = on > 0 && on < boxes.length;
    }

    /* ---------- 事件 ---------- */
    const offSort = Tenon.core.on(table, "click", "[data-sort]", (e, th) => {
      e.preventDefault();
      const key = th.dataset.sort;
      if (sortKey === key) dir = -dir;
      else { sortKey = key; dir = 1; }
      page = 1;
      render();
    });

    const offCheck = Tenon.core.on(table, "change", "[data-check-all], [data-check]", (e, box) => {
      if (box.hasAttribute("data-check-all")) {
        if (virtualOn) {
          /* 窗口会随滚动变化，只勾当前窗口会让状态乱跳，
             所以虚拟滚动下「全选」= 选中整个筛选结果 */
          if (box.checked) pool.forEach((r) => picked.add(String(r.id)));
          else picked.clear();
          qsa("[data-check]", tbody).forEach((c) => (c.checked = box.checked));
        } else {
          qsa("[data-check]", tbody).forEach((c) => (c.checked = box.checked));
        }
      }
      collectPicked();
      syncCheckAll();
      table.dispatchEvent(new CustomEvent("tenon:table-select", { bubbles: true, detail: { selected: selected() } }));
    });

    /* 分页容器可能后建（先是空 div），所以单独维护解绑函数 */
    let pagerOff = () => {};
    const bindPager = () => {
      const box = pagerBox();
      if (!box || box.__tnPager) return;
      box.__tnPager = true;
      pagerOff = Tenon.core.on(box, "click", "[data-page]", (e, btn) => {
        e.preventDefault();
        if (btn.disabled) return;
        page = Math.max(1, Number(btn.dataset.page));
        render();
      });
    };
    bindPager();

    /* ---------- 列宽拖拽 ---------- */

    /* 一旦拖过一列，就把表格切成 fixed 布局并用 colgroup 记住每列宽度，
       否则 auto 布局下浏览器会把设定的宽度当最小值，拖不动。 */
    function colGroup() {
      let cg = table.querySelector("colgroup[tn-data-cols]");
      if (cg) return cg;
      const ths = qsa("th", table.tHead.rows[0]);
      cg = document.createElement("colgroup");
      cg.setAttribute("tn-data-cols", "");
      ths.forEach((th) => {
        const col = document.createElement("col");
        col.style.width = Math.round(th.getBoundingClientRect().width) + "px";
        cg.appendChild(col);
      });
      table.insertBefore(cg, table.firstChild);
      table.style.tableLayout = "fixed";
      return cg;
    }

    function bindResize() {
      if (table.dataset.resize === "off" || !table.tHead || !table.tHead.rows[0]) return () => {};

      const ths = qsa("th", table.tHead.rows[0]);
      const handles = ths.map((th, i) => {
        const h = Tenon.kit.node("colResizer", "span");
        h.dataset.colResize = String(i);
        h.setAttribute("aria-hidden", "true");
        // 点把手不该顺带触发排序
        h.addEventListener("click", (e) => e.stopPropagation());
        th.appendChild(h);
        return h;
      });

      let drag = null;

      function onMove(e) {
        if (!drag) return;
        const w = Math.max(48, Math.round(drag.w + e.clientX - drag.x));
        drag.cg.children[drag.i].style.width = w + "px";
        paintSticky();          // 列宽变了，固定列的 left 要重算
      }

      function onUp() {
        if (!drag) return;
        const w = Math.round(ths[drag.i].getBoundingClientRect().width);
        Tenon.kit.setState(table, "resizing", false);
        document.body.style.userSelect = "";
        const detail = { index: drag.i, width: w };
        drag = null;
        document.removeEventListener("pointermove", onMove);
        table.dispatchEvent(new CustomEvent("tenon:table-resize", { bubbles: true, detail }));
      }

      const offDown = Tenon.core.on(table, "pointerdown", "[data-col-resize]", (e, h) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const i = Number(h.dataset.colResize);
        drag = { i, x: e.clientX, w: ths[i].getBoundingClientRect().width, cg: colGroup() };
        Tenon.kit.setState(table, "resizing", true);
        document.body.style.userSelect = "none";
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp, { once: true });
      });

      return () => {
        offDown();
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        handles.forEach((h) => h.remove());
        const cg = table.querySelector("colgroup[tn-data-cols]");
        if (cg) cg.remove();
        table.style.tableLayout = "";
        document.body.style.userSelect = "";
        drag = null;
      };
    }

    /* ---------- 固定表头 / 固定列 ---------- */

    const STICKY = String(table.dataset.sticky || "")
      .split(/[,\s]+/).filter(Boolean);
    const stickyHead = STICKY.includes("head");
    const stickyCols = Number(STICKY.filter((s) => /^\d+$/.test(s))[0] || 0);

    /**
     * 给需要吸附的单元格打标记并算出 left 偏移。
     * tbody 每次 render 都会重建，所以 render 末尾必须再调一次。
     */
    function paintSticky() {
      if (!stickyHead && !stickyCols) return;
      const ths = table.tHead ? qsa("th", table.tHead.rows[0]) : [];
      if (!ths.length) return;

      /* 列左偏移按实测宽度累加：colgroup 只在拖过列宽后才存在 */
      const lefts = [];
      let acc = 0;
      ths.forEach((th) => {
        lefts.push(Math.round(acc));
        acc += th.getBoundingClientRect().width;
      });

      const apply = (cell, isHead) => {
        const i = cell.cellIndex;
        const vals = [];
        if (isHead && stickyHead) vals.push("head");
        if (i < stickyCols) {
          vals.push("col");
          cell.style.left = lefts[i] + "px";
          /* 最后一次冻结列的右缘是「接缝」，标出来让皮肤画投影，
             否则滚过去的内容会贴着冻结列，看不出分界 */
          if (i === stickyCols - 1) vals.push("edge");
        }
        if (vals.length) cell.setAttribute("tn-data-sticky", vals.join(" "));
        else {
          cell.removeAttribute("tn-data-sticky");
          cell.style.left = "";
        }
      };

      qsa("th", table).forEach((th) => apply(th, true));
      qsa("td", tbody).forEach((td) => apply(td, false));
    }

    function clearSticky() {
      qsa("[tn-data-sticky]", table).forEach((c) => {
        c.removeAttribute("tn-data-sticky");
        c.style.left = "";
      });
    }

    /* ---------- API ---------- */
    const api = {
      get data() { return source; },
      get page() { return page; },
      get size() { return pageSize; },
      get sortKey() { return sortKey; },
      select(ids) {
        picked.clear();
        [].concat(ids || []).forEach((id) => picked.add(String(id)));
        applyPicked();
        syncCheckAll();
      },
      selected,
      search(text) {
        const q = String(text || "").trim().toLowerCase();
        filterFn = q ? (row) => row.text.toLowerCase().includes(q) : null;
        pool = filterFn ? source.filter(filterFn) : source.slice();
        page = 1;
        render();
        bindPager();
      },
      filter(fn) {
        filterFn = fn;
        pool = fn ? source.filter((row, i) => fn(row, i)) : source.slice();
        page = 1;
        render();
        bindPager();
      },
      reset() {
        filterFn = null;
        pool = source.slice();
        page = 1;
        sortKey = "";
        dir = 1;
        render();
      },
      setData(rows) {
        source.length = 0;
        picked.clear();          // 换了一批数据，旧选择无意义
        rows.forEach((html) => {
          const tr = Tenon.core.el("tbody");
          tr.innerHTML = html;
          const node = tr.firstElementChild;
          source.push({
            id: node.dataset.rowId || (node.querySelector("[data-check]") || {}).dataset?.check || "",
            html: node.outerHTML,
            text: node.textContent.replace(/\s+/g, " ").trim(),
            cells: qsa("td", node).map((td) => td.textContent.trim())
          });
        });
        pool = source.slice();
        page = 1;
        rowMeasured = false;      // 换了数据，重新量一次行高
        render();
        bindPager();
      },
      add(html) { api.setData([...source.map((r) => r.html), html]); },
      remove(id) {
        picked.delete(String(id));
        const i = source.findIndex((r) => String(r.id) === String(id));
        if (i < 0) return false;
        source.splice(i, 1);
        pool = filterFn ? source.filter(filterFn) : source.slice();
        render();
        return true;
      },
      render,
      destroy() {
        offSort(); offCheck(); pagerOff(); offResize(); offVirtual(); clearSticky();
        document.removeEventListener("tenon:lang", onLang);
        const box = pagerBox();
        if (box) box.__tnPager = false;
      }
    };

    /* 切语言时自己重绘：分页器文案是渲染出来的，等下次手动翻页就太晚了 */
    const onLang = () => render(true);
    document.addEventListener("tenon:lang", onLang);

    /* 顺序有讲究：bindVirtual 必须先跑，它负责找到滚动容器；
       否则首次 render 时 scroller 还是 null，会把整表画出来。 */
    const offVirtual = bindVirtual();
    render();
    bindPager();
    const offResize = bindResize();
    return api;
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});
