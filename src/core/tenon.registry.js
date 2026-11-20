/* ===========================================================
   tenon.registry.js — 组件注册表 / 扫描器 / 生命周期
   -----------------------------------------------------------
   组件化约定：

     1. 页面只写 HTML，用 class 或 data-* 声明“这里是个什么控件”
     2. 控件模块调用 Tenon.component(name, { selector, init, destroy })
        注册自己，不关心何时被扫描
     3. 页签或页面片段插入 DOM 后统一调 Tenon.init(root)，
        扫描到就初始化，重复调用安全（打 tn-data-done 标记）
     4. 销毁用 Tenon.destroy(root)，供页签刷新时回收定时器/全局监听

   一个组件可以：
     - 只做事件委托（无实例，如 switch）
     - 返回实例对象（有状态，如 table），存到 el.__tn 上，
       外部用 Tenon.get(el) 取回

   本文件与设计无关：不认识任何类名、颜色与尺寸。
   =========================================================== */

/* ---------------- 组件注册表 ---------------- */

Tenon.components = Tenon.components || {};

/**
 * 注册一个控件
 * @param {string} name 组件名
 * @param {object} def { selector, init(root, elCtx?), destroy(el), multi }
 *   selector — CSS 选择器；命中即初始化
 *   init     — (el, ctx) => instance|null；ctx 为扫描根，便于查询同页兄弟节点
 *   destroy  — (el, instance) => void
 */
Tenon.component = function (name, def) {
  Tenon.components[name] = Object.assign({ name }, def);
  return Tenon.components[name];
};

/** 取元素上挂的控件实例 */
Tenon.get = function (node, name) {
  const store = node && node.__tn;
  if (!store) return null;
  return name ? store[name] || null : store;
};

/* ---------------- 扫描器 ---------------- */

const DONE_ATTR = "tn-data-done";

/* 这两个函数在 IIFE 外面，必须从 Tenon.core 取工具，别直接用 qsa */
const pick = (root, sel) => Tenon.core.qsa(sel, root);

function markDone(node, name) {
  const list = (node.getAttribute(DONE_ATTR) || "").split(/\s+/).filter(Boolean);
  if (!list.includes(name)) list.push(name);
  node.setAttribute(DONE_ATTR, list.join(" "));
}

function isDone(node, name) {
  const list = (node.getAttribute(DONE_ATTR) || "").split(/\s+/);
  return list.includes(name);
}

/**
 * 初始化 root 下所有已注册控件（含 root 自身）
 * @param {Element|Document} root
 * @param {string[]} [only] 只初始化指定组件，便于局部刷新
 */
Tenon.init = function (root, only) {
  root = root || document;
  const names = only || Object.keys(Tenon.components);
  names.forEach((name) => {
    const def = Tenon.components[name];
    if (!def || !def.selector) return;
    // root 本身也可能就是控件节点
    const nodes = [];
    if (root.nodeType === 1 && root.matches(def.selector)) nodes.push(root);
    pick(root, def.selector).forEach((n) => nodes.push(n));

    nodes.forEach((node) => {
      if (isDone(node, name)) return;
      let inst = null;
      try {
        inst = def.init(node, root) || {};
      } catch (err) {
        console.error("[tenon:" + name + "] 初始化失败", node, err);
        return;
      }
      node.__tn = node.__tn || {};
      node.__tn[name] = inst;
      markDone(node, name);
    });
  });
  return root;
};

/**
 * 销毁 root 下的控件实例（页签关闭 / 刷新前调用）
 * 组件没写 destroy 也能跑：只清实例引用与标记
 */
Tenon.destroy = function (root) {
  root = root || document;
  const nodes = [];
  if (root.nodeType === 1) nodes.push(root);
  pick(root, "[" + DONE_ATTR + "]").forEach((n) => nodes.push(n));

  nodes.forEach((node) => {
    const store = node.__tn;
    if (!store) return;
    Object.keys(store).forEach((name) => {
      const def = Tenon.components[name];
      if (def && typeof def.destroy === "function") {
        try {
          def.destroy(node, store[name]);
        } catch (err) {
          console.error("[tenon:" + name + "] 销毁失败", node, err);
        }
      }
    });
    delete node.__tn;
    node.removeAttribute(DONE_ATTR);
  });
};

/* ---------------- DOM 就绪 ---------------- */

Tenon.ready = function (fn) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
  else fn();
};
