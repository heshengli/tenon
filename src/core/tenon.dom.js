/* ===========================================================
   tenon.dom.js — DOM 工具与事件委托
   -----------------------------------------------------------
   这一层只认识「元素」和「事件」，不认识任何类名、颜色与尺寸。
   任何需要 design token 的东西都不属于这里。

   对外暴露 Tenon.core.{qs,qsa,el,on,esc,pad2,num}
   =========================================================== */
Tenon.core = (function () {
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function el(tag, cls, html) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  /**
   * 事件委托：页面片段会被整体替换，交互一律走委托
   * @param {Element} root 委托根
   * @param {string} type 事件类型，可用 "click change" 一次绑多个
   * @param {string} selector 目标选择器
   * @param {(e:Event, target:Element)=>void} handler
   * @returns {()=>void} 解绑函数
   */
  function on(root, type, selector, handler) {
    const types = type.split(/\s+/);
    const fn = (e) => {
      const target = e.target.closest && e.target.closest(selector);
      if (target && root.contains(target)) handler(e, target);
    };
    types.forEach((t) => root.addEventListener(t, fn));
    return () => types.forEach((t) => root.removeEventListener(t, fn));
  }

  const esc = (v) =>
    String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

  /** 数字补零 / 千分位等小工具 */
  const pad2 = (n) => String(n).padStart(2, "0");
  const num = (v, def = 0) => (Number.isFinite(Number(v)) ? Number(v) : def);

  return { qs, qsa, el, on, esc, pad2, num };
})();
