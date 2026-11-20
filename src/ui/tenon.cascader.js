/* ===========================================================
   tenon.cascader.js — 级联选择（省市区 / 类目树）
   -----------------------------------------------------------
   数据源还是原生 select，层级用 data-parent 描述：

     <select tn-data="cascader" data-placeholder="选择地区">
       <option value="330000">浙江省</option>
       <option value="330100" data-parent="330000">杭州市</option>
       <option value="330102" data-parent="330100">上城区</option>
       <option value="330106" data-parent="330100">西湖区</option>
       <option value="320000">江苏省</option>
     </select>

   为什么不用嵌套 <optgroup>：HTML 解析器遇到内层 optgroup 会把外层提前闭合，
   拿到的 DOM 是平的。扁平 option + data-parent 才是能活下来的写法，
   而且 FormData、表单校验、sel.value 全都照旧。

   规则：
     · 没有 data-parent 的是根节点
     · 被别的 option 当作 parent 的，是「分叉」，点了往里钻，不可选
     · 没有子节点的叶子才可选，选中后写回原生 option

   事件：change（原生）/ tenon:cascader { value, labels }
   实例 API：open / close / get / path / destroy
   =========================================================== */
Tenon.component("cascader", {
  selector: 'select[tn-data~="cascader"]',

  init(sel) {
    const kit = () => Tenon.kit;

    let placeholderText = sel.dataset.placeholder || Tenon.i18n.t("cascader.placeholder");

    /* ---------------- 建树 ---------------- */

    function buildTree() {
      const nodes = new Map();
      Array.from(sel.options).forEach((o) => {
        nodes.set(o.value, { label: o.textContent.trim(), value: o.value, option: o, children: [] });
      });
      const roots = [];
      Array.from(sel.options).forEach((o) => {
        const node = nodes.get(o.value);
        const parent = o.dataset.parent;
        if (parent && nodes.has(parent)) nodes.get(parent).children.push(node);
        else roots.push(node);
      });
      return roots;
    }

    let tree = buildTree();

    /** 有人把它当 parent → 它是分叉，不可选 */
    const hasChild = (v) => Array.from(sel.options).some((o) => o.dataset.parent === v);

    /* 原生 select 会默认选中首项；首项若是分叉（比如「浙江省」），
       这个值本身就是非法的，先清掉，免得表单悄悄提交一个省。
       注意必须用 selectedIndex = -1：单选框一旦「没有选中项」，
       浏览器会立刻回选第一个可选项，把 option.selected 置 false 是无效的。 */
    const auto = sel.selectedOptions[0];
    if (auto && auto.value && hasChild(auto.value)) sel.selectedIndex = -1;

    /* 选中项到根的标签链 */
    function labelsOf(value) {
      const out = [];
      const byVal = new Map();
      Array.from(sel.options).forEach((o) => byVal.set(o.value, o));
      let cur = byVal.get(value);
      let guard = 0;
      while (cur && guard++ < 20) {
        out.unshift(cur.textContent.trim());
        cur = cur.dataset.parent ? byVal.get(cur.dataset.parent) : null;
      }
      return out;
    }

    /* ---------------- 骨架 ---------------- */

    const wrap = kit().node("cascader", "div");
    const trigger = kit().node("cascaderTrigger", "button");
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "listbox");

    const panel = kit().node("cascaderPanel", "div");
    kit().setState(panel, "hidden", true);

    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    sel.hidden = true;
    sel.setAttribute("tabindex", "-1");

    /* ---------------- 渲染 ---------------- */

    let path = [];                       // 每层选中的下标

    function columns() {
      const cols = [tree];
      path.forEach((idx, level) => {
        const node = cols[level] && cols[level][idx];
        if (node && node.children.length) cols.push(node.children);
      });
      return cols;
    }

    function renderTrigger() {
      const chosen = sel.selectedOptions[0];
      const valid = chosen && chosen.value && !hasChild(chosen.value);
      const labels = valid ? labelsOf(chosen.value) : [];
      trigger.innerHTML = "";
      const span = kit().node("cascaderValue", "span");
      span.textContent = labels.length ? labels.join(" / ") : placeholderText;
      trigger.appendChild(span);
      kit().setState(trigger, "placeholder", !labels.length);
    }

    function renderPanel() {
      const cols = columns();
      panel.innerHTML = "";
      cols.forEach((list, level) => {
        const col = kit().node("cascaderCol", "div");
        col.setAttribute("role", "group");
        col.setAttribute("aria-label", Tenon.i18n.t("cascader.level", { n: level + 1 }));
        list.forEach((node, idx) => {
          const btn = kit().node("cascaderOption", "button");
          btn.type = "button";
          btn.dataset.col = String(level);
          btn.dataset.idx = String(idx);
          btn.setAttribute("role", "menuitem");
          const isBranch = node.children.length > 0;
          btn.innerHTML = `<span>${node.label}</span>` + (isBranch ? "<i>›</i>" : "");
          if (!isBranch && node.value === sel.value) kit().setState(btn, "active", true);
          if (isBranch && path[level] === idx) kit().setState(btn, "active", true);
          col.appendChild(btn);
        });
        panel.appendChild(col);
      });
    }

    /* ---------------- 交互 ---------------- */

    const pop = Tenon.popover.create({
      wrap, trigger, panel,
      onOpen() {
        tree = buildTree();
        /* 打开时把面板定位到当前选中项 */
        const chosen = sel.selectedOptions[0];
        path = [];
        if (chosen && chosen.value && !hasChild(chosen.value)) {
          const byVal = new Map(Array.from(sel.options).map((o) => [o.value, o]));
          const chain = [];
          let cur = byVal.get(chosen.value);
          let guard = 0;
          while (cur && guard++ < 20) {
            chain.unshift(cur);
            cur = cur.dataset.parent ? byVal.get(cur.dataset.parent) : null;
          }
          for (let i = 0; i < chain.length - 1; i++) {
            const idx = columns()[i].findIndex((n) => n.value === chain[i].value);
            if (idx >= 0) path.push(idx);
          }
        }
        renderPanel();
        const first = panel.querySelector("[data-col]");
        if (first) first.focus();
      }
    });

    function commit(node) {
      Array.from(sel.options).forEach((o) => { o.selected = o.value === node.value; });
      renderTrigger();
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      sel.dispatchEvent(new CustomEvent("tenon:cascader", {
        bubbles: true,
        detail: { value: node.value, labels: labelsOf(node.value) }
      }));
    }

    const offTrigger = Tenon.core.on(trigger, "click", "*", () => pop.toggle());

    const offPanel = Tenon.core.on(panel, "click", "[data-col]", (e, btn) => {
      e.preventDefault();
      const level = Number(btn.dataset.col);
      const idx = Number(btn.dataset.idx);
      const node = columns()[level][idx];
      if (!node) return;

      if (node.children.length) {
        path = path.slice(0, level).concat(idx);
        renderPanel();
      } else {
        commit(node);
        pop.hide();
      }
    });

    /* 键盘：↑↓ 同列移动，→ 下钻，← 回上一列（Enter 由 button 原生触发） */
    const offKeys = Tenon.core.on(panel, "keydown", "[data-col]", (e, cur) => {
      const col = Number(cur.dataset.col);
      const idx = Number(cur.dataset.idx);
      const inCol = (lv) => Tenon.core.qsa('[data-col="' + lv + '"]', panel);

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = inCol(col)[idx + (e.key === "ArrowDown" ? 1 : -1)];
        if (next) next.focus();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        cur.click();                                   // 分支会下钻并重绘
        const next = inCol(col + 1)[0];
        if (next) next.focus();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = inCol(col - 1);
        if (!prev.length) return;
        const want = path[col - 1];
        (prev[want] || prev[0]).focus();
      }
    });

    const onLang = () => {
      placeholderText = Tenon.i18n.t("cascader.placeholder");
      renderTrigger();
    };
    document.addEventListener("tenon:lang", onLang);

    renderTrigger();

    return {
      open: pop.show,
      close: pop.hide,
      isOpen: pop.isOpen,
      get: () => sel.value,
      path: () => labelsOf(sel.value),

      destroy() {
        offTrigger(); offPanel(); offKeys();
        document.removeEventListener("tenon:lang", onLang);
        pop.destroy();
        sel.hidden = false;
        sel.removeAttribute("tabindex");
        if (wrap.parentNode) {
          wrap.parentNode.insertBefore(sel, wrap);
          wrap.remove();
        }
      }
    };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});
