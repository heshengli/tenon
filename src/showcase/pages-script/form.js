/* ===========================================================
   pages-script/form.js — form 页的业务（只做业务，不碰外观）
   -----------------------------------------------------------
   控件负责状态，皮肤负责长相，这里只负责「发生什么」：
   收到事件 → 给一句人话反馈。
   =========================================================== */
Tenon.page.define("form", function (root) {
  const { qs } = Tenon.core;

  /* ---------- 表单 ---------- */
  const form = qs("form[tn-data-validate]", root);
  if (form) {
    form.addEventListener("tenon:form-submit", (e) => {
      const n = Object.keys(e.detail.data).length;
      Tenon.ui.toast("校验通过，收下 " + n + " 个字段");
    });
  }

  /* ---------- 控件事件 → 反馈 ---------- */
  root.addEventListener("tenon:segment", (e) => {
    Tenon.ui.toast("周期切到「" + e.detail.value + "」", "info");
  });

  root.addEventListener("tenon:option", (e) => {
    Tenon.ui.toast("优先级：" + e.detail.text, "info");
  });

  root.addEventListener("tenon:rate", (e) => {
    Tenon.ui.toast("评分 " + e.detail.value + " 分", "info");
  });

  /* 开关派发的是原生 change，值在 detail.on 里 */
  root.addEventListener("change", (e) => {
    const t = e.target;
    if (!t || !t.matches || !t.matches('[tn-data~="switch"]')) return;
    Tenon.ui.toast("开关现在是" + (e.detail && e.detail.on ? "开" : "关"), "info");
  });

  /* ---------- 四个反馈入口 ---------- */
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;

    if (act === "toast") {
      Tenon.ui.toast("这是一条轻提示");
    } else if (act === "modal") {
      Tenon.ui.modal({
        title: "弹窗标题",
        body: "<p style='margin:0'>弹窗的长相也来自 skin.css：<code>[tn-data-part=\"modal\"]</code>。</p>",
        okText: "知道了",
        onOk() { Tenon.ui.toast("点了确定"); }
      });
    } else if (act === "confirm") {
      Tenon.ui.confirm("删除确认", "确定要删除这条记录吗？此操作不可撤销。", () => {
        Tenon.ui.toast("已删除");
      });
    } else if (act === "loading") {
      const done = Tenon.ui.loading("正在处理…");
      setTimeout(done, 1200);
    }
  });
});
