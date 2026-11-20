/* ===========================================================
   tenon.dialog.js — 声明式弹窗触发器
   -----------------------------------------------------------
   把“点按钮 → 打开某种弹窗”这件事写成属性，不再写脚本：

     <button tn-data-dialog="alert" data-title="标题" data-body="<p>…</p>">
     <button tn-data-dialog="confirm" data-title="删除确认"
             data-body="删除后不可恢复" data-ok-text="删 除"
             tn-data-toast="已删除">
     <button tn-data-dialog="drawer" data-title="详情" data-body="…">
     <button tn-data-dialog="#tpl-user">          用页面里现成的节点当内容

   data-width 可指定宽度；tn-data-toast 为确认后的提示文案。
   =========================================================== */
Tenon.component("dialog", {
  selector: "[tn-data-dialog]",

  init(btn) {
    const T = (k, v) => Tenon.i18n.t(k, v);
    const off = Tenon.core.on(btn, "click", "[tn-data-dialog]", (e) => {
      e.preventDefault();
      const kind = btn.getAttribute(Tenon.attr("dialog"));
      const title = btn.dataset.title || "";

      /* 内联模板：#id 指向页面里已有的节点 */
      if (kind.startsWith("#")) {
        const tpl = document.querySelector(kind);
        if (!tpl) return;
        Tenon.ui.modal({
          title: title || Tenon.i18n.t("dialog.detail"),
          width: Number(btn.dataset.width) || 560,
          body: tpl.innerHTML
        });
        return;
      }

      const body = btn.dataset.body || "";

      if (kind === "confirm") {
        Tenon.ui.confirm(
          title || Tenon.i18n.t("dialog.confirmTitle"),
          body || Tenon.i18n.t("dialog.confirmBody"),
          () => { const t = btn.getAttribute(Tenon.attr("toast")); if (t) Tenon.ui.toast(t); },
          btn.dataset.okText ? { okText: btn.dataset.okText } : undefined
        );
        return;
      }

      const preset = {
        alert: { title: T("dialog.demo.alert.title"), body: T("dialog.demo.alert.body"), width: 480 },
        drawer: { title: T("dialog.demo.drawer.title"), body: T("dialog.demo.drawer.body"), width: 460 },
        basic: { title: T("dialog.demo.basic.title"), body: T("dialog.demo.basic.body"), width: 480 }
      }[kind] || { title: T("dialog.demo.fallback.title"), body: "", width: 480 };

      Tenon.ui.modal({
        title: title || preset.title,
        body: body || preset.body,
        width: Number(btn.dataset.width) || preset.width,
        okText: btn.dataset.okText || Tenon.i18n.t("ui.ok")
      });
    });

    return { destroy: off };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});
