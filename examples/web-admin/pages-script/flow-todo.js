/* ===========================================================
   pages-script/flow-todo.js — 待办任务：同意 / 驳回
   -----------------------------------------------------------
   审批成功后把该条从待办里移走（等价服务端重渲染），
   全部处理完显示空态，不整页刷新。
   =========================================================== */
Tenon.page.define("flow-todo", function (root) {
  const { qs, qsa } = Tenon.core;

  function emptyIfDone() {
    const list = qs(".stack .stack", root) || root;
    if (list.querySelector("[data-approve]")) return;
    const card = root.querySelector(".card-bd");
    if (card) card.innerHTML = `<span class="muted">暂无待办任务</span>`;
    const extra = root.querySelector(".card-extra");
    if (extra) extra.innerHTML = "";
  }

  Tenon.core.on(root, "click", "[data-approve]", async (e, btn) => {
    btn.disabled = true;
    const res = await Tenon.ajax.post("/api/flows/approve", {
      id: btn.dataset.id,
      ok: btn.dataset.approve
    });
    Tenon.ajax.handle(res, { skipRefresh: true });
    btn.disabled = false;
    if (String(res.statusCode) !== "200") return;

    const item = btn.closest(".between");
    if (item) {
      item.style.transition = "opacity .18s";
      item.style.opacity = "0";
      setTimeout(() => {
        item.remove();
        emptyIfDone();
      }, 180);
    }
  });
});
