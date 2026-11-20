/* ===========================================================
   tenon.ui.js — 反馈类控件：Toast / Modal / Confirm / Loading
   -----------------------------------------------------------
   命令式 API（页面脚本用）：
     Tenon.ui.toast("已保存", "success")
     Tenon.ui.modal({ title, body, width, onOk })
     Tenon.ui.confirm("删除后不可恢复", () => …)
     const done = Tenon.ui.loading("提交中…"); done();

   声明式：
     <button tn-data-toast="success" tn-data-text="已保存">

   本文件只管「什么时候弹、弹几层、怎么关」，
   长什么样由 Tenon.kit 决定 —— 这里一个类名都没有。
   =========================================================== */
Tenon.ui = (function () {
  const { qs, on } = Tenon.core;
  const T = (k, v) => Tenon.i18n.t(k, v);

  /* ---------------- Toast ---------------- */

  /* 文案走 i18n，切换语言后下一次弹就是新语言 */
  const toastDefault = (kind) => T("ui.toast." + (kind || "info"));

  function toast(message, type = "success") {
    /* 宿主可提供 toast 容器；没有就退回 body，行为不变、位置交给套件 CSS */
    const host = qs(Tenon.kit.part("toastRoot")) || document.body;
    const node = Tenon.kit.toast(message, type);
    host.appendChild(node);
    setTimeout(() => {
      node.style.opacity = "0";
      setTimeout(() => node.remove(), 200);
    }, 2200);
  }

  /* ---------------- Modal ---------------- */

  const openStack = [];   // 支持嵌套，Esc 只关最上层

  function modal(opts) {
    const o = Object.assign({
      title: T("ui.tip"), body: "", width: 520, okText: T("ui.ok"),
      cancelText: T("ui.cancel"), danger: false, hideCancel: false,
      onOk: null, onClose: null
    }, opts);

    const mask = Tenon.kit.modal(o);
    const body = mask.querySelector("[tn-data-modal-body]") || mask;

    if (o.body instanceof HTMLElement) body.appendChild(o.body);
    else body.innerHTML = o.body || "";

    document.body.appendChild(mask);
    Tenon.init(body);                     // 弹窗里的控件也要能初始化

    function close(viaOk) {
      const i = openStack.indexOf(handle);
      if (i > -1) openStack.splice(i, 1);
      mask.remove();
      if (!viaOk && typeof o.onClose === "function") o.onClose();
    }

    mask.addEventListener("click", (e) => {
      if (e.target === mask || e.target.closest("[data-close]") || e.target.closest("[data-cancel]")) close(false);
      if (e.target.closest("[data-ok]")) {
        close(true);
        if (typeof o.onOk === "function") o.onOk(body);
      }
    });

    const handle = { close: () => close(false), root: mask, body };
    openStack.push(handle);
    return handle;
  }

  function confirm(title, content, onOk, opts) {
    return modal(Object.assign({
      title, width: 420, danger: true, onOk,
      body: Tenon.kit.confirm(content)
    }, opts));
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !openStack.length) return;
    openStack[openStack.length - 1].close();
  });

  /* ---------------- 遮罩 Loading ---------------- */

  let loadingNode = null;

  function loading(text = Tenon.i18n.t("ui.loading")) {
    if (loadingNode) return () => {};
    loadingNode = Tenon.kit.loading(text);
    document.body.appendChild(loadingNode);
    return () => {
      if (loadingNode) loadingNode.remove();
      loadingNode = null;
    };
  }

  /* ---------------- 声明式：tn-data-toast ---------------- */

  Tenon.component("toast", {
    selector: "[tn-data-toast]",
    init(node) {
      /* 解绑函数存在实例里，destroy 时真正移除监听，而不是只翻标志位 */
      const off = on(node, "click", "[tn-data-toast]", () => {
        const kind = node.getAttribute(Tenon.attr("toast")) || "success";
        toast(node.getAttribute(Tenon.attr("text")) || toastDefault(kind), kind);
      });
      return { destroy: off };
    },
    destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
  });

  return { toast, modal, confirm, loading };
})();
