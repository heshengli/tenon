/* ===========================================================
   pages-script/query.js — 客户查询
   -----------------------------------------------------------
   条件框 → 交给 tenon.table 的 filter()；
   “共 N 条” 跟着表格的 tenon:table-change 事件走，
   这样筛选结果与分页总数永远一致。
   =========================================================== */
Tenon.page.define("query", function (root) {
  const { qs } = Tenon.core;
  const table = Tenon.get(qs("table[tn-data]", root), "table");
  if (!table) return;

  const name = qs("#q-name", root);
  const level = qs("#q-level", root);
  const status = qs("#q-status", root);
  const count = qs("#q-count", root);

  /* 结果表列序：客户 / 公司 / 等级 / 合同额 / 状态 / 建档日期 */
  function apply() {
    const n = name.value.trim().toLowerCase();
    const lv = level.value;
    const st = status.value;
    table.filter((row) => {
      const hitName = !n || (row.cells[0] + row.cells[1]).toLowerCase().includes(n);
      const hitLevel = !lv || row.cells[2] === lv;
      const hitStatus = !st || row.cells[4] === st;
      return hitName && hitLevel && hitStatus;
    });
  }

  Tenon.core.on(root, "input", "#q-name", apply);
  Tenon.core.on(root, "change", "#q-level, #q-status", apply);

  root.addEventListener("tenon:table-change", (e) => {
    if (count) count.textContent = "共 " + e.detail.total + " 条";
  });
});
