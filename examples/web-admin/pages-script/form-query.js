/* ===========================================================
   pages-script/form-query.js — 表单查询页面
   -----------------------------------------------------------
   条件栏 → tenon.table 的 filter()；“更多条件”只切 CSS 类；
   统计文案跟着表格的 tenon:table-change 事件重算（本页合计只算当前页）。
   =========================================================== */
Tenon.page.define("form-query", function (root) {
  const { qs, qsa } = Tenon.core;
  const table = Tenon.get(qs("table[tn-data]", root), "table");
  if (!table) return;

  const kw = qs("#fq-kw", root);
  const level = qs("#fq-level", root);
  const status = qs("#fq-status", root);
  const from = qs("#fq-from", root);
  const to = qs("#fq-to", root);
  const stat = qs("#fq-stat", root);
  const bar = qs(".filter-bar", root);

  /* 结果表列序：编号 / 名称 / 公司 / 等级 / 合同额 / 状态 / 建档日期 / 操作 */
  function apply() {
    const n = (kw.value || "").trim().toLowerCase();
    const lv = level.value;
    const st = status.value;
    const d1 = from.value;
    const d2 = to.value;

    table.filter((row) => {
      if (n && !(row.cells[1] + row.cells[2]).toLowerCase().includes(n)) return false;
      if (lv && row.cells[3] !== lv) return false;
      if (st && row.cells[5] !== st) return false;
      if (d1 && row.cells[6] < d1) return false;
      if (d2 && row.cells[6] > d2) return false;
      return true;
    });
  }

  /* 本页合计：直接读当前 tbody，和表格渲染结果永远一致 */
  function paintStat(total) {
    if (!stat) return;
    const tbody = qs("tbody", root);
    const sum = qsa("tr", tbody).reduce((acc, tr) => {
      const cell = tr.children[4];
      if (!cell) return acc;
      return acc + (Number(cell.textContent.replace(/[^\d.]/g, "")) || 0);
    }, 0);
    stat.textContent = `${total} 条 / 本页合计 ¥ ${sum.toLocaleString()}`;
  }

  root.addEventListener("tenon:table-change", (e) => paintStat(e.detail.total));

  Tenon.core.on(root, "click", "[data-fq], [data-fq-detail]", (e, btn) => {
    const act = btn.dataset.fq;

    if (btn.hasAttribute("data-fq-detail")) {
      const id = btn.dataset.id;
      const row = table.data.find((r) => String(r.id) === String(id));
      if (!row) return;
      Tenon.ui.modal({
        title: "客户详情",
        width: 520,
        hideCancel: true,
        body: `<div>
          <div class="desc-row"><span class="desc-label">客户编号</span><span>${row.cells[0]}</span></div>
          <div class="desc-row"><span class="desc-label">客户名称</span><span>${row.cells[1]}</span></div>
          <div class="desc-row"><span class="desc-label">所属公司</span><span>${row.cells[2]}</span></div>
          <div class="desc-row"><span class="desc-label">等级</span><span>${row.cells[3]}</span></div>
          <div class="desc-row"><span class="desc-label">合同额</span><span>${row.cells[4]}</span></div>
          <div class="desc-row"><span class="desc-label">状态</span><span>${row.cells[5]}</span></div>
          <div class="desc-row"><span class="desc-label">建档日期</span><span>${row.cells[6]}</span></div>
        </div>`
      });
      return;
    }

    if (act === "search") return apply();

    if (act === "reset") {
      [kw, from, to].forEach((el) => { if (el) el.value = ""; });
      [level, status].forEach((el) => { if (el) el.value = ""; });
      return apply();
    }

    if (act === "more") {
      const open = bar.classList.toggle("expanded");
      btn.textContent = open ? "收起 ▲" : "更多条件 ▼";
      return;
    }

    if (act === "export") {
      Tenon.ui.toast("已导出 CSV（模拟）");
    }
  });

  /* 首屏统计按当前页算一次 */
  paintStat(table.data.length);
});
