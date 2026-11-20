/* ===========================================================
   pages-script/flow-mine.js — 我的流程：查看详情 / 撤销
   -----------------------------------------------------------
   行数据直接读表格单元格，不额外维护一份模型；
   撤销成功后就地改状态，不整页刷新。
   =========================================================== */
Tenon.page.define("flow-mine", function (root) {
  const { esc } = Tenon.core;

  const STATUS_TAG = { 已完成: "ok", 已驳回: "err", 审批中: "warn", 已撤销: "default" };

  function cellsOf(btn) {
    const tr = btn.closest("tr");
    return tr ? [...tr.children].map((td) => td.textContent.trim()) : [];
  }

  Tenon.core.on(root, "click", "[data-view-flow]", (e, btn) => {
    const c = cellsOf(btn);
    const flow = (MOCK_DB.flows || []).find((f) => f.id === c[0]) || {};
    Tenon.ui.modal({
      title: "流程详情",
      width: 560,
      hideCancel: true,
      body: `<div>
        <div class="desc-row"><span class="desc-label">编号</span><span>${esc(c[0])}</span></div>
        <div class="desc-row"><span class="desc-label">标题</span><span>${esc(c[1])}</span></div>
        <div class="desc-row"><span class="desc-label">类型</span><span>${esc(c[2])}</span></div>
        <div class="desc-row"><span class="desc-label">发起人</span><span>${esc(c[3])}</span></div>
        <div class="desc-row"><span class="desc-label">日期</span><span>${esc(c[4])}</span></div>
        <div class="desc-row"><span class="desc-label">当前节点</span><span>${esc(flow.node || "—")}</span></div>
        <div class="desc-row"><span class="desc-label">状态</span><span>${esc(flow.status || c[5])}</span></div>
      </div>`
    });
  });

  Tenon.core.on(root, "click", "[data-cancel]", (e, btn) => {
    const id = btn.dataset.cancel;
    Tenon.ui.confirm("撤销流程", "确定撤销该流程吗？撤销后不可恢复。", async () => {
      const res = await Tenon.ajax.post("/api/flows/cancel", { id });
      Tenon.ajax.handle(res, { skipRefresh: true });
      if (String(res.statusCode) !== "200") return;

      const tr = btn.closest("tr");
      if (!tr) return;
      const statusCell = tr.children[5];
      if (statusCell) statusCell.innerHTML = `<span class="tag tag-${STATUS_TAG["已撤销"]}">已撤销</span>`;
      btn.remove();
    });
  });
});
