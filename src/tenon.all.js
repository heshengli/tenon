/*!
 * Tenon v2.0.0 — 单文件版（自动合并，勿手改）
 * 由 tools/build.js 生成；改动请改各模块源码后重新构建。
 * 合并顺序：
 *    1. core/tenon.core.js
 *    2. shell/tenon.theme.js
 *    3. shell/tenon.auth.js
 *    4. core/tenon.dom.js
 *    5. core/tenon.registry.js
 *    6. core/tenon.i18n.js
 *    7. i18n/tenon.zh-CN.js
 *    8. i18n/tenon.en.js
 *    9. ui/tenon.kit.js
 *   10. ui/tenon.kit.antd.js
 *   11. ui/tenon.ui.js
 *   12. shell/tenon.ajax.js
 *   13. ui/tenon.popover.js
 *   14. ui/tenon.dropdown.js
 *   15. ui/tenon.dialog.js
 *   16. ui/tenon.tabs.js
 *   17. ui/tenon.switch.js
 *   18. ui/tenon.collapse.js
 *   19. ui/tenon.segmented.js
 *   20. ui/tenon.rate.js
 *   21. ui/tenon.optionlist.js
 *   22. ui/tenon.select.js
 *   23. ui/tenon.cascader.js
 *   24. ui/tenon.upload.js
 *   25. ui/tenon.tree.js
 *   26. ui/tenon.table.js
 *   27. ui/tenon.form.js
 *   28. ui/tenon.chart.js
 *   29. shell/tenon.navtab.js
 *   30. shell/tenon.accordion.js
 */
/* ======================== core/tenon.core.js ======================== */
/* ===========================================================
   tenon.core.js — 命名空间与版本
   -----------------------------------------------------------
   Tenon（榫）：页面只写标记，行为靠属性咬合。
   榫头由控件提供，卯眼由框架预留，靠形状咬合，不用一根钉子。

   本文件只做两件事：建命名空间、写版本号。
   不放任何逻辑，因此它必须是第一个被加载的文件。

   分层（依赖方向单向）：
     core  ←  ui  ←  shell  ←  pages

   命名只有一处，不设别名。
   =========================================================== */
window.Tenon = window.Tenon || {};

/** 语义化版本：主版本.次版本.修订号 */
Tenon.version = "2.0.0";

/**
 * 框架自有属性的前缀。
 *
 *   1. 框架命名空间 —— tn-data / tn-data-* ：「这里是什么控件」+ 框架内部参数
 *   2. 控件公开参数 —— data-<短名>：如 data-page-size、data-rule（不带本前缀）
 *
 * 有四个控件天生就需要一个参数，那个参数兼作声明：tn-data-dialog、tn-data-dropdown、
 * tn-data-validate、tn-data-toast。再让它们写一遍 tn-data="dialog" 只是重复。
 *
 * 所有**运行时算出来**的属性名都走 Tenon.attr()，别处不要再手拼前缀。
 *
 * 注意边界：改 PREFIX 只影响运行期生成的属性名（tn-data-state-* / tn-data-part），
 * 页面里写死的标记和控件的静态选择器要一起改 —— 换句话说，它是一处「单一来源」，
 * 不是「改一个常量就全站改名」的魔法。
 */
Tenon.PREFIX = "tn-data";

/** 拼框架属性名：attr() → "tn-data"，attr("part") → "tn-data-part" */
Tenon.attr = function (suffix) {
  return Tenon.PREFIX + (suffix ? "-" + suffix : "");
};

/* ======================== shell/tenon.theme.js ======================== */
/* ===========================================================
   tenon.theme.js — 主题引擎 — 主色切换 / 派生色计算 / 本地持久化 / 设置抽屉
   -----------------------------------------------------------
   只改 <html> 上的 CSS 变量，即可全局生效（含 SVG 图表）。

   本文件在 <head> 里加载，此时套件还没就位（kit 在 body 末），
   所以 apply() 拆成两段：变量与存储立刻生效，界面同步等 kit 就绪。
   抽屉的长相由 Tenon.kit.tpl("themeDrawer") 提供，这里不写类名。
   =========================================================== */
(function () {
  const APP = document.documentElement.getAttribute("data-app") || "tenon";
  const KEY = APP + ":primary";
  /* 默认主色由宿主决定：<html data-primary="#a3e635">。
     皮肤不同，默认色就该不同 —— 这一项不该写死在框架里。 */
  const DECLARED = (document.documentElement.getAttribute("data-primary") || "").trim();
  const DEFAULT = /^#[0-9a-f]{6}$/i.test(DECLARED) ? DECLARED.toLowerCase() : "#1677ff";
  /* [词条 key, 色值] —— 名字在渲染抽屉时才取词，切语言后重开就是新语言 */
  const PRESETS = [
    ["blue", "#1677ff"],
    ["geek", "#2f54eb"],
    ["purple", "#722ed1"],
    ["magenta", "#eb2f96"],
    ["volcano", "#fa541c"],
    ["sunset", "#faad14"],
    ["cyan", "#13c2c2"],
    ["green", "#52c41a"],
    ["graphite", "#1f1f1f"]
  ];

  const presetList = () => PRESETS.map(([key, color]) => [Tenon.i18n.t("theme.preset." + key), color]);

  let current = DEFAULT;

  const kit = () => (window.Tenon && Tenon.kit) || null;

  function hex2rgb(hex) {
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  /** 将颜色与目标色混合，weight 为 target 的占比 */
  function mix(hex, target, weight) {
    const a = hex2rgb(hex);
    const b = hex2rgb(target);
    const ch = (k) => Math.round(a[k] * (1 - weight) + b[k] * weight);
    return "#" + ["r", "g", "b"].map((k) => ch(k).toString(16).padStart(2, "0")).join("");
  }

  /** 界面同步：抽屉里的选中态、色值框、取色器 */
  function syncUI(color) {
    const K = kit();
    if (!K) return;
    document.querySelectorAll(K.part("swatch")).forEach((b) => {
      K.setState(b, "active", b.dataset.color === color);
    });
    const hex = document.querySelector(K.part("themeHex"));
    if (hex) hex.value = color.toUpperCase();
    const picker = document.querySelector("[data-picker]");
    if (picker) picker.value = color;
  }

  function apply(color) {
    if (!/^#[0-9a-f]{6}$/i.test(color || "")) color = DEFAULT;
    color = color.toLowerCase();
    current = color;

    const s = document.documentElement.style;
    s.setProperty("--primary", color);
    s.setProperty("--primary-hover", mix(color, "#ffffff", 0.18));
    s.setProperty("--primary-active", mix(color, "#000000", 0.18));
    s.setProperty("--primary-bg", mix(color, "#ffffff", 0.90));
    s.setProperty("--primary-border", mix(color, "#ffffff", 0.53));

    try { localStorage.setItem(KEY, color); } catch (e) { /* 隐私模式忽略 */ }

    syncUI(color);
  }

  /**
   * 主题抽屉。
   *
   * 它没有走 Tenon.popover —— 这是刻意的：抽屉带遮罩、是**模态**的（开着时不该能
   * 操作后面的页面），而 popover 是**非模态**的「点外面就关」。两者对遮罩、焦点、
   * Esc 的期望不同，硬合成一个抽象会让两边都别扭。这里的重复属于「不该合并的重复」。
   */
  function buildDrawer() {
    const K = kit();
    if (!K) return;
    if (document.querySelector(K.part("themeDrawer"))) return;

    const mask = K.node("themeMask");
    const drawer = K.node("themeDrawer");
    drawer.innerHTML = K.tpl("themeDrawer", { presets: presetList(), current });

    document.body.append(mask, drawer);

    /* 关闭时把 keydown 一并摘掉，别留常驻监听 */
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    function close() {
      mask.remove();
      drawer.remove();
      document.removeEventListener("keydown", onKey);
    }
    mask.addEventListener("click", close);
    drawer.querySelector("[data-close]").addEventListener("click", close);
    document.addEventListener("keydown", onKey);

    drawer.querySelectorAll(K.part("swatch")).forEach((btn) => {
      btn.addEventListener("click", () => apply(btn.dataset.color));
    });

    const picker = drawer.querySelector("[data-picker]");
    let timer = null;
    picker.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => apply(picker.value), 120);
    });

    drawer.querySelector("[data-reset]").addEventListener("click", () => apply(DEFAULT));

    apply(current); // 同步初始选中态
  }

  function init() {
    const run = () => {
      const trigger = document.getElementById("theme-trigger");
      if (trigger) trigger.addEventListener("click", buildDrawer);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
    else run();
  }

  let saved = DEFAULT;
  try { saved = localStorage.getItem(KEY) || DEFAULT; } catch (e) { /* 忽略 */ }
  apply(saved);

  window.Tenon = window.Tenon || {};
  Tenon.theme = { apply, open: buildDrawer, presets: PRESETS, presetList };
  init();
})();

/* ======================== shell/tenon.auth.js ======================== */
/* ===========================================================
   tenon.auth.js — 登录态：登录 / 退出 / 访问守卫
   -----------------------------------------------------------
   故意不依赖 Tenon.dom：index.html 要在 <head> 里就调用 guard()，
   此时 DOM 工具还没加载，提前跳转可避免页面闪一下再跳走。
   勾「记住我」写 localStorage（关浏览器仍在），否则写 sessionStorage。
   =========================================================== */
window.Tenon = window.Tenon || {};

Tenon.auth = (function () {
  /* 存储键带应用前缀：同一个域名下挂两个后台时不会互相顶掉登录态。
     宿主用 <html data-app="my-admin"> 指定，默认 tenon。 */
  const APP = document.documentElement.getAttribute("data-app") || "tenon";
  const KEY = APP + ":user";
  const LOGIN_PAGE = "login.html";

  const read = (store) => {
    try { return JSON.parse(store.getItem(KEY) || "null"); } catch (e) { return null; }
  };

  /** 当前登录用户；未登录返回 null */
  function user() {
    return read(localStorage) || read(sessionStorage);
  }

  function clear() {
    try {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
    } catch (e) { /* 隐私模式忽略 */ }
  }

  /** 写入登录态，remember 决定存哪 */
  function login(name, remember) {
    const data = { name: String(name || "admin"), at: Date.now() };
    clear();
    try {
      (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(data));
    } catch (e) { /* 忽略 */ }
    return data;
  }

  /** 退出：清登录态并回登录页（replace 避免回退又进后台） */
  function logout() {
    clear();
    location.replace(LOGIN_PAGE);
  }

  /** 未登录直接跳登录页；登录页自己不要调 */
  function guard() {
    if (!user()) location.replace(LOGIN_PAGE);
    return !!user();
  }

  return { user, login, logout, guard, KEY };
})();

/* ======================== core/tenon.dom.js ======================== */
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

/* ======================== core/tenon.registry.js ======================== */
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

/* ======================== core/tenon.i18n.js ======================== */
/* ===========================================================
   tenon.i18n.js — 文案引擎（只管取词，不含任何词条）
   -----------------------------------------------------------
   词条按语言拆到 src/i18n/ 下，一个语言一个文件：

     tenon.i18n.js → tenon.zh-CN.js → tenon.en.js → …（基准语言先加载）

   用法：
     Tenon.i18n.use("en");                                    // 切换并重译页面
     Tenon.i18n.t("pager.total", { n: 12 });                   // → "12 items in total"
     Tenon.i18n.define("ja", { "pager.prev": "前へ" });        // 补一套/覆盖词条

     <button tn-data-i18n="ui.ok"></button>                    // 文本
     <input tn-data-i18n-ph="select.search">                    // placeholder
     <span tn-data-i18n-title="navtab.more"></span>             // title

   查找顺序：当前语言 → 基准语言（zh-CN）→ 直接返回 key。
   缺词条不该让界面空掉，露出 key 反而好排查。

   语言码做前缀解析：en / en-US / en-GB 都落到 en，zh / zh-Hans 落到 zh-CN。
   宿主写 <html lang="en-US"> 也能命中，不必和文件名严格一致。
   =========================================================== */
Tenon.i18n = (function () {
  const BASE = "zh-CN";

  /** locale → { key: text }。由 i18n/*.js 里的 define() 灌进来 */
  const DICT = {};

  let current = BASE;
  let warned = false;

  /** 补语言或覆盖词条；返回合并后的字典，便于断言 */
  function define(locale, dict) {
    const key = String(locale || "").trim();
    if (!key) return null;
    DICT[key] = Object.assign({}, DICT[key] || {}, dict || {});
    return DICT[key];
  }

  /** en-US → en、zh-Hans → zh-CN：认得的就用，认不得退回基准 */
  function resolve(locale) {
    const want = String(locale || "").trim();
    if (!want) return BASE;
    if (DICT[want]) return want;

    const short = want.split("-")[0].toLowerCase();
    const keys = Object.keys(DICT);
    const exact = keys.find((k) => k.toLowerCase() === short);
    if (exact) return exact;
    const sameLang = keys.find((k) => k.split("-")[0].toLowerCase() === short);
    return sameLang || BASE;
  }

  /**
   * 取文案；vars 里的 {name} 会被替换。
   * 词条也可以写成 { one, other } —— 传了 n 就按单复数取。
   */
  function t(key, vars) {
    const pick = (dict) => (dict ? dict[key] : undefined);
    let s = pick(DICT[current]);
    if (s == null) s = pick(DICT[BASE]);
    if (s == null) {
      if (!warned && !Object.keys(DICT).length) {
        warned = true;
        console.warn("[tenon:i18n] 还没加载任何语言文件，先引 src/i18n/tenon.zh-CN.js");
      }
      return key;                                 // 缺词条就露 key，别静默空掉
    }

    if (s && typeof s === "object") {
      s = Number(vars && vars.n) === 1 ? s.one : s.other;
      if (s == null) return key;
    }
    if (vars) {
      s = String(s).replace(/\{(\w+)\}/g, (m, k) =>
        (vars[k] == null ? m : String(vars[k])));
    }
    return s;
  }

  const attr = (suffix) => Tenon.attr(suffix);

  /** 翻译 root 下所有带 i18n 标记的节点 */
  function apply(root) {
    const scope = root || document;
    const qsa = (sel) => Array.prototype.slice.call(scope.querySelectorAll(sel));

    qsa("[" + attr("i18n") + "]").forEach((el) => {
      el.textContent = t(el.getAttribute(attr("i18n")));
    });
    qsa("[" + attr("i18n-ph") + "]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute(attr("i18n-ph"))));
    });
    qsa("[" + attr("i18n-title") + "]").forEach((el) => {
      el.setAttribute("title", t(el.getAttribute(attr("i18n-title"))));
    });
    return scope;
  }

  /** 切换语言：重译页面 + 广播事件，外壳/页面可以据此重绘自己那段 */
  function use(locale) {
    current = resolve(locale);
    document.documentElement.setAttribute("lang", current);   // 读屏与 :lang() 都要它
    apply(document);
    document.dispatchEvent(new CustomEvent("tenon:lang", { detail: { locale: current } }));
    return current;
  }

  const locales = () => Object.keys(DICT);

  /* 初始语言：<html lang> 认得的就用（此时词表可能还没加载，resolve 会退回基准） */
  const declared = (document.documentElement.getAttribute("lang") || "").trim();
  current = declared ? resolve(declared) : BASE;

  /* DOM 就绪后先翻一遍页面标记 */
  const boot = () => apply(document);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  return {
    get current() { return current; },
    get base() { return BASE; },
    locales, define, resolve, use, t, apply
  };
})();

/* ======================== i18n/tenon.zh-CN.js ======================== */
/* ===========================================================
   tenon.zh-CN.js — 简体中文词表（基准语言）
   -----------------------------------------------------------
   基准语言的词条。其它语言缺词条时会回落到这里。
   只放词条，不放逻辑。引擎在 core/tenon.i18n.js，加载顺序：
     tenon.i18n.js  →  tenon.zh-CN.js  →  （按需）其它语言
   =========================================================== */
Tenon.i18n.define("zh-CN", {
      "pager.total": "共 {n} 条",
      "pager.prev": "上一页",
      "pager.next": "下一页",

      "table.empty": "没有符合条件的记录",
      "empty.select": "请选择左侧菜单",
      "empty.loading": "正在加载…",

      "navtab.refresh": "刷新标签页",
      "navtab.close": "关闭标签页",
      "navtab.closeOthers": "关闭其它标签页",
      "navtab.closeAll": "关闭全部标签页",
      "navtab.more": "全部标签页",
      "navtab.closedOthers": "已关闭其它标签页",
      "navtab.closeTitle": "关闭",

      "ui.tip": "提示",
      "ui.toast.success": "操作成功",
      "ui.toast.error": "操作失败，请重试",
      "ui.toast.info": "这是一条提示信息",
      "ui.ok": "确 定",
      "ui.cancel": "取 消",
      "ui.loading": "加载中…",

      "select.placeholder": "请选择",
      "select.search": "搜索",
      "cascader.placeholder": "请选择",

      "upload.hint": "点击选择文件，或拖拽到这里",
      "upload.limitCount": "最多 {n} 个",
      "upload.limitSize": "单个不超过 {n} MB",
      "upload.tooLarge": "{name} 超过 {n} MB，已跳过",
      "upload.tooMany": "最多只能选 {n} 个文件",
      "upload.remove": "移除",

      "common.close": "关闭",
      "accordion.expand": "展开菜单",
      "accordion.collapse": "收起菜单",
      "navtab.refreshed": "{title} 已刷新",
      "ajax.scriptFail": "脚本加载失败：{src}",
      "ajax.pageFail": "页面加载失败：{status} {url}",
      "ajax.emptyPage": "页面片段为空",
      "ajax.requestFail": "请求失败",
      "ajax.requestFailCode": "请求失败：{status}",
      "dialog.detail": "详情",
      "dialog.confirmTitle": "确认操作",
      "dialog.confirmBody": "确定执行该操作吗？",
      "dropdown.clicked": "点击了：{text}",
      "form.checkRequired": "请检查表单必填项",
      "form.submitting": "提交中…",
      "form.submit": "提 交",
      "form.required": "此项必填",
      "form.phone": "请输入正确的 11 位手机号",
      "form.tel": "电话格式不正确",
      "form.email": "邮箱格式不正确",
      "form.number": "请输入数字",
      "form.int": "请输入整数",
      "form.money": "金额最多两位小数",
      "form.idcard": "身份证号格式不正确",
      "form.minlen": "至少 {n} 个字符",
      "form.maxlen": "最多 {n} 个字符",
      "chart.bar": "柱状图",
      "chart.line": "折线图",
      "chart.pie": "饼图",
      "cascader.level": "第 {n} 级",
      "kit.themeNote": "外观由当前套件决定",
      "kit.antdTheme": "Ant Design 主题",

      "theme.preset.blue": "拂晓蓝",
      "theme.preset.geek": "极客蓝",
      "theme.preset.purple": "酱紫",
      "theme.preset.magenta": "法式洋红",
      "theme.preset.volcano": "火山",
      "theme.preset.sunset": "日暮",
      "theme.preset.cyan": "明青",
      "theme.preset.green": "极光绿",
      "theme.preset.graphite": "石墨黑",
      "dialog.demo.alert.title": "对话框标题",
      "dialog.demo.alert.body": "这是一个标准对话框，支持自定义宽度、页脚按钮与关闭回调。",
      "dialog.demo.drawer.title": "抽屉（用对话框模拟）",
      "dialog.demo.drawer.body": "抽屉从侧边滑出，内容区可滚动。此处用居中对话框模拟交互。",
      "dialog.demo.basic.title": "基础弹窗",
      "dialog.demo.basic.body": "点击遮罩、右上角 × 或“取消”均可关闭。",
      "dialog.demo.fallback.title": "对话框",
      "theme.title": "主题设置",
      "theme.color": "主题色",
      "theme.custom": "自定义颜色",
      "theme.reset": "恢复默认",
      "theme.pick": "选择自定义主题色",
      "theme.noteColor": "主题色实时应用到按钮、选中态、进度条与图表，并保存在本地浏览器。",
      "theme.noteCustom": "任意取色，系统会自动派生 hover / 选中底色 / 边框色。"
    });

/* ======================== i18n/tenon.en.js ======================== */
/* ===========================================================
   tenon.en.js — English dictionary
   -----------------------------------------------------------
   英文词条。引擎解析 en / en-US / en-GB 都会落到这里。
   只放词条，不放逻辑。引擎在 core/tenon.i18n.js，加载顺序：
     tenon.i18n.js  →  tenon.zh-CN.js  →  （按需）其它语言
   =========================================================== */
Tenon.i18n.define("en", {
      "pager.total": { "one": "{n} item in total", "other": "{n} items in total" },
      "pager.prev": "Prev",
      "pager.next": "Next",

      "table.empty": "No matching records",
      "empty.select": "Pick a menu on the left",
      "empty.loading": "Loading…",

      "navtab.refresh": "Reload tab",
      "navtab.close": "Close tab",
      "navtab.closeOthers": "Close other tabs",
      "navtab.closeAll": "Close all tabs",
      "navtab.more": "All tabs",
      "navtab.closedOthers": "Other tabs closed",

      "ui.tip": "Notice",
      "ui.toast.success": "Done",
      "ui.toast.error": "Something went wrong, please retry",
      "ui.toast.info": "Just a heads-up",
      "ui.ok": "OK",
      "ui.cancel": "Cancel",
      "ui.loading": "Loading…",

      "select.placeholder": "Select",
      "select.search": "Search",
      "cascader.placeholder": "Select",

      "upload.hint": "Click to choose a file, or drop it here",
      "upload.limitCount": "up to {n}",
      "upload.limitSize": "max {n} MB each",
      "upload.tooLarge": "{name} is over {n} MB and was skipped",
      "upload.tooMany": "You can select at most {n} files",
      "upload.remove": "Remove",

      "common.close": "Close",
      "accordion.expand": "Expand menu",
      "accordion.collapse": "Collapse menu",
      "navtab.refreshed": "{title} reloaded",
      "ajax.scriptFail": "Failed to load script: {src}",
      "ajax.pageFail": "Failed to load page: {status} {url}",
      "ajax.emptyPage": "Empty page fragment",
      "ajax.requestFail": "Request failed",
      "ajax.requestFailCode": "Request failed: {status}",
      "dialog.detail": "Details",
      "dialog.confirmTitle": "Confirm",
      "dialog.confirmBody": "Are you sure you want to continue?",
      "dropdown.clicked": "Clicked: {text}",
      "form.checkRequired": "Please check the required fields",
      "form.submitting": "Submitting…",
      "form.submit": "Submit",
      "form.required": "This field is required",
      "form.phone": "Enter a valid 11-digit mobile number",
      "form.tel": "Invalid phone format",
      "form.email": "Invalid email format",
      "form.number": "Enter a number",
      "form.int": "Enter an integer",
      "form.money": "At most two decimal places",
      "form.idcard": "Invalid ID number",
      "form.minlen": "At least {n} characters",
      "form.maxlen": "At most {n} characters",
      "chart.bar": "Bar chart",
      "chart.line": "Line chart",
      "chart.pie": "Pie chart",
      "cascader.level": "Level {n}",
      "kit.themeNote": "Appearance is decided by the current kit",
      "kit.antdTheme": "Ant Design theme",

      "theme.preset.blue": "Dawn Blue",
      "theme.preset.geek": "Geek Blue",
      "theme.preset.purple": "Purple",
      "theme.preset.magenta": "Magenta",
      "theme.preset.volcano": "Volcano",
      "theme.preset.sunset": "Sunset",
      "theme.preset.cyan": "Cyan",
      "theme.preset.green": "Polar Green",
      "theme.preset.graphite": "Graphite",
      "dialog.demo.alert.title": "Dialog title",
      "dialog.demo.alert.body": "A standard dialog with custom width, footer buttons and close callback.",
      "dialog.demo.drawer.title": "Drawer (simulated with a dialog)",
      "dialog.demo.drawer.body": "A drawer slides in from the side with a scrollable body. Simulated here by a centered dialog.",
      "dialog.demo.basic.title": "Basic dialog",
      "dialog.demo.basic.body": "Close it by clicking the mask, the × in the corner, or Cancel.",
      "dialog.demo.fallback.title": "Dialog",
      "theme.title": "Theme",
      "theme.color": "Primary color",
      "theme.custom": "Custom color",
      "theme.reset": "Reset",
      "theme.pick": "Pick a color",
      "theme.noteColor": "Applies to buttons, selections, progress bars and charts; saved locally.",
      "theme.noteCustom": "Any color works — hover, tint and border shades are derived automatically."
    });

/* ======================== ui/tenon.kit.js ======================== */
/* ===========================================================
   tenon.kit.js — UI 套件接口与兜底实现
   -----------------------------------------------------------
   这一层解决的问题：控件只表达「逻辑状态」，不写「物理类名」。

     控件说：Tenon.kit.setState(item, "open", true)
     套件答：antd 套件写 class="open"；裸套件写 tn-data-state-open

   四个概念
     state  逻辑状态：on / open / active / hidden / sorted / error / show …
     part   逻辑部件：collapseItem / treeRow / field / sortArrow …
     snippet 由脚本重建局部 DOM 时用的片段：pager / tag / toast / modal …
     skeleton 外壳骨架：node() 造容器、tpl() 造标记（页签 / 面包屑 /
            飞出层 / 菜单项 / 主题抽屉），外壳自己一行类名都不用写

   本文件提供 plain 兜底实现：状态用属性表达、部件用 [tn-data-part]
   定位，因此不依赖任何 CSS 也能跑通，只是没有视觉效果。
   真正的皮肤由 tenon.kit.<名称>.js 覆盖，比如 tenon.kit.antd.js。

   换 UI 的步骤：写一个 kit 文件 + 一套 CSS，页面标记不用动。
   外壳与套件的分工：外壳管 id 与 data-* 契约，套件管类名与标签长相。
   =========================================================== */
Tenon.kit = (function () {
  /* 转义统一走内核，不在这里复制一份 */
  const esc = (s) => Tenon.core.esc(s);
  const T = (k, v) => Tenon.i18n.t(k, v);


  /* 逻辑名是驼峰（JS 习惯），落到属性上一律 kebab（HTML 习惯）：
     setState(el,"hasActive") → tn-data-state-has-active
     node("tabClose")         → tn-data-part="tab-close"                */
  const kebab = (s) => String(s).replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

  /* ---------------- 兜底套件：无类名 ---------------- */

  const plain = {
    name: "plain",

    setState(el, state, on) {
      const attr = Tenon.attr("state-" + kebab(state));
      if (on) el.setAttribute(attr, "");
      else el.removeAttribute(attr);
    },

    hasState(el, state) {
      return el.hasAttribute(Tenon.attr("state-" + kebab(state)));
    },

    part(name) {
      return "[" + Tenon.attr("part") + '="' + kebab(name) + '"]';
    },

    /* ---------- 骨架 ---------- */

    /** 外壳自建容器：裸套件只留一个逻辑部件属性，不留类名 */
    node(name, tag) {
      const el = document.createElement(tag || "div");
      el.setAttribute(Tenon.attr("part"), kebab(name));
      return el;
    },

    /** 图标类名：裸套件不给图标，只留文字与 aria-label */
    icon(name) {
      return "";
    },

    /** 外壳标记模板：契约属性照写，外观交给套件 */
    tpl(name, d) {
      d = d || {};
      switch (name) {
        case "tab":
          return `<span>${esc(d.title)}</span>` +
            (d.fixed ? ""
              : `<span tn-data-part="tab-close" data-tab-close="${esc(d.id)}">×</span>`);

        case "crumb":
          return (d.group ? `<span tn-data-part="crumb-link">${esc(d.group)}</span><span tn-data-part="crumb-sep">/</span>` : "")
            + `<span tn-data-part="crumb-cur">${esc(d.title)}</span>`;

        case "empty":
          return `<div tn-data-part="empty">${esc(d.text || "")}</div>`;

        case "divider":
          return `<div tn-data-part="menu-divider"></div>`;

        case "pickItem":
          return `<div tn-data-part="menu-item" data-pick="${esc(d.id)}"${d.active ? ' tn-data-state-active=""' : ""}>`
            + `<span tn-data-part="pick-title">${esc(d.title)}</span>`
            + (d.closable
              ? `<span tn-data-part="pick-close" data-pick-close="${esc(d.id)}" title="${T("common.close")}">×</span>`
              : "")
            + `</div>`;

        case "pickAction":
          return `<button tn-data-part="menu-item" data-pick-act="${esc(d.act)}"${d.disabled ? ' tn-data-state-disabled="" disabled' : ""}>`
            + `${esc(d.text)}</button>`;

        case "ctxItem":
          return `<button tn-data-part="menu-item" data-ctx="${esc(d.act)}"${d.disabled ? ' tn-data-state-disabled="" disabled' : ""}>`
            + `<span>${esc(d.text)}</span>`
            + (d.key ? `<span tn-data-part="dd-key">${esc(d.key)}</span>` : "")
            + `</button>`;

        case "flyout":
          return `<div tn-data-part="flyout-title">${esc(d.title)}</div>`
            + (d.items || []).map((it) =>
              `<a href="${esc(it.url)}" tn-data-part="flyout-item" data-view="${esc(it.id)}"${it.active ? ' tn-data-state-active=""' : ""}>${esc(it.text)}</a>`
            ).join("");

        case "themeDrawer":
          return `<div tn-data-part="theme-head">
              <span>${T("theme.title")}</span>
              <button tn-data-part="theme-close" data-close aria-label="${T("common.close")}">×</button>
            </div>
            <div tn-data-part="theme-body">
              <div tn-data-part="theme-section">
                <div tn-data-part="theme-label">${T("theme.color")}</div>
                <div tn-data-part="swatches">
                  ${(d.presets || []).map(([name, color]) =>
                    `<button tn-data-part="swatch" data-color="${esc(color)}" title="${esc(name)}">
                      <i style="background:${esc(color)}"></i><span>${esc(name)}</span>
                    </button>`).join("")}
                </div>
                <div tn-data-part="theme-note">${T("theme.noteColor")}</div>
              </div>
              <div tn-data-part="theme-section">
                <div tn-data-part="theme-label">${T("theme.custom")}</div>
                <div tn-data-part="theme-custom">
                  <input type="color" data-picker value="${esc(d.current)}" aria-label="${T("theme.pick")}">
                  <input tn-data-part="theme-hex" value="${esc(String(d.current || "").toUpperCase())}" readonly>
                </div>
                <div tn-data-part="theme-note">${T("theme.noteCustom")}</div>
              </div>
            </div>
            <div tn-data-part="theme-foot">
              <button tn-data-part="theme-reset" data-reset>${T("theme.reset")}</button>
              <span tn-data-part="theme-note">${T("kit.themeNote")}</span>
            </div>`;

        default:
          return "";
      }
    },

    /* ---------- 片段 ---------- */

    pager(page, pages, total) {
      let mid = "";
      for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - page) <= 1) {
          mid += `<button data-page="${i}" ${i === page ? "aria-current=\"page\"" : ""}>${i}</button>`;
        }
      }
      return `<nav tn-data-part="pager">
        <span tn-data-part="pager-info">${T("pager.total", { n: total })}</span>
        <button data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>${T("pager.prev")}</button>
        ${mid}
        <button data-page="${page + 1}" ${page >= pages ? "disabled" : ""}>${T("pager.next")}</button>
      </nav>`;
    },

    count(total) {
      return `<span tn-data-part="pager-info">${T("pager.total", { n: total })}</span>`;
    },

    tag(text, type = "default") {
      return `<span tn-data-part="tag" tn-data-tag="${esc(type)}">${esc(text)}</span>`;
    },

    emptyRow(colspan) {
      return `<tr><td colspan="${colspan || 1}">${T("table.empty")}</td></tr>`;
    },

    confirm(content) {
      return `<div tn-data-part="confirm">${content}</div>`;
    },

    /* ---------- 节点 ---------- */

    toast(message, type = "success") {
      const node = document.createElement("div");
      node.setAttribute("tn-data-part", "toast");
      node.setAttribute("tn-tn-data-toast", type);
      node.textContent = message;
      return node;
    },

    modal(o) {
      const mask = document.createElement("div");
      mask.setAttribute("tn-data-part", "modal");
      mask.innerHTML = `<div role="dialog" aria-modal="true" style="width:${o.width || 480}px">
        <header>
          <span>${esc(o.title || "")}</span>
          <button data-close aria-label="${T("common.close")}">×</button>
        </header>
        <div tn-data-modal-body></div>
        <footer>
          ${o.hideCancel ? "" : `<button data-cancel>${esc(o.cancelText || T("ui.cancel"))}</button>`}
          <button data-ok>${esc(o.okText || T("ui.ok"))}</button>
        </footer>
      </div>`;
      return mask;
    },

    loading(text) {
      const mask = document.createElement("div");
      mask.setAttribute("tn-data-part", "loading-mask");
      mask.innerHTML = `<div tn-data-part="loading">${esc(text || T("ui.loading"))}</div>`;
      return mask;
    },

    menu(items) {
      const box = document.createElement("div");
      box.setAttribute("tn-data-part", "menu");
      box.innerHTML = items
        .map((it) => `<button tn-data-menu-item ${it.danger ? "tn-data-danger" : ""}>${esc(it.text)}</button>`)
        .join("");
      return box;
    }
  };

  /* ---------------- 当前生效的套件 ---------------- */

  let active = plain;

  const api = {
    get name() {
      return active.name;
    },

    /** 当前生效的套件对象，便于临时替换后还原 */
    get current() {
      return active;
    },

    /** 切换套件；只需实现想改的方法，其余回落到 plain */
    use(kit) {
      active = Object.assign({}, plain, kit || {});
      return api;
    },

    /** 恢复兜底实现 */
    reset() {
      active = plain;
      return api;
    },

    setState(el, state, on) {
      active.setState(el, state, on);
      return el;
    },

    hasState(el, state) {
      return active.hasState(el, state);
    },

    part(name) {
      return active.part(name);
    },

    node(name, tag) {
      return active.node(name, tag);
    },

    icon(name) {
      return active.icon(name);
    },

    tpl(name, data) {
      return active.tpl(name, data);
    },

    pager(page, pages, total) {
      return active.pager(page, pages, total);
    },

    count(total) {
      return active.count(total);
    },

    tag(text, type) {
      return active.tag(text, type);
    },

    emptyRow(colspan) {
      return active.emptyRow(colspan);
    },

    confirm(content) {
      return active.confirm(content);
    },

    toast(message, type) {
      return active.toast(message, type);
    },

    modal(o) {
      return active.modal(o);
    },

    loading(text) {
      return active.loading(text);
    },

    menu(items) {
      return active.menu(items);
    }
  };

  return api;
})();

/* ======================== ui/tenon.kit.antd.js ======================== */
/* ===========================================================
   tenon.kit.antd.js — Ant Design 风格套件
   -----------------------------------------------------------
   把逻辑状态与逻辑部件翻译成 Ant Design 的类名，
   并给出这套皮肤下的标记片段与外壳骨架。

   本文件是「唯一」允许出现 .a-rate / .switch / .tag / .tab 这类
   Ant Design 类名的地方。控件与外壳里一个都不许有。

   配套样式：examples/web-admin/assets/css/*
   =========================================================== */
/* 模块级别名：tpl 与各片段方法共用，避免每个方法各自声明 */
const tnT = (k, v) => Tenon.i18n.t(k, v);
const tnEsc = (s) => Tenon.core.esc(s);

Tenon.kit.use({
  name: "antd",

  /* 逻辑状态 → 类名 */
  STATE: {
    on: "on",
    open: "open",
    active: "active",
    hidden: "hidden",
    sorted: "sorted",
    resizing: "resizing",
    error: "is-error",
    show: "show",
    disabled: "disabled",
    /* 外壳用到的状态 */
    empty: "is-empty",
    fixed: "tab-fixed",
    ctxTarget: "ctx-target",
    hasActive: "has-active",
    flyoutOn: "flyout-on",
    collapsed: "collapsed",
    siderCollapsed: "sider-collapsed"
  },

  /* 逻辑部件 → 选择器 */
  PART: {
    rateStar: "i",
    switchDot: ".switch-dot",
    collapseItem: ".a-collapse-item",
    treeRow: ".tree-row",
    treeChildren: ".tree-children",
    treeCaret: ".tree-caret",
    tabsScope: ".card-bd",
    field: ".field",
    errorText: ".err-text",
    sortArrow: ".th-arrow",
    tableWrap: ".table-wrap",
    colResizer: ".col-resizer",
    select: ".select",
    selectTrigger: ".select-trigger",
    selectPanel: ".select-panel",
    selectOption: ".select-option",
    selectTag: ".select-tag",
    selectValue: ".select-value",
    cascader: ".cascader",
    cascaderTrigger: ".cascader-trigger",
    cascaderPanel: ".cascader-panel",
    cascaderCol: ".cascader-col",
    cascaderOption: ".cascader-option",
    cascaderValue: ".cascader-value",
    upload: ".upload",
    uploadZone: ".upload-zone",
    uploadList: ".upload-list",
    uploadItem: ".upload-item",
    uploadName: ".upload-name",
    uploadSize: ".upload-size",
    uploadRemove: ".upload-remove",
    selectSearch: ".select-search",
    card: "section, .card",
    dropdownItem: ".dropdown-item",
    toastRoot: "#toast-root",
    /* 外壳读取宿主 HTML 时用的部件 */
    app: ".app",
    sider: ".sider",
    menuGroup: ".menu-group",
    menuTitle: ".mt",
    swatch: ".swatch",
    themeHex: ".theme-hex",
    themeMask: ".theme-mask",
    tab: ".tab",
    pane: ".pane",
    dropdown: ".dropdown",
    moreMenu: ".tab-more-menu",
    flyout: ".menu-flyout",
    themeDrawer: ".theme-drawer"
  },

  /* 逻辑部件 → 容器类名（外壳自建节点时用） */
  CLASS: {
    tab: "tab",
    pane: "pane",
    dropdown: "dropdown",
    moreMenu: "dropdown tab-more-menu",
    flyout: "menu-flyout",
    colResizer: "col-resizer",
    select: "select",
    selectTrigger: "select-trigger",
    selectPanel: "select-panel",
    selectOption: "select-option",
    selectTag: "select-tag",
    selectValue: "select-value",
    cascader: "cascader",
    cascaderTrigger: "cascader-trigger",
    cascaderPanel: "cascader-panel",
    cascaderCol: "cascader-col",
    cascaderOption: "cascader-option",
    cascaderValue: "cascader-value",
    upload: "upload",
    uploadZone: "upload-zone",
    uploadList: "upload-list",
    uploadItem: "upload-item",
    uploadName: "upload-name",
    uploadSize: "upload-size",
    uploadRemove: "upload-remove",
    selectSearch: "select-search",
    themeMask: "theme-mask",
    themeDrawer: "theme-drawer"
  },

  setState(el, state, on) {
    const cls = this.STATE[state] || state;
    el.classList.toggle(cls, !!on);
  },

  hasState(el, state) {
    return el.classList.contains(this.STATE[state] || state);
  },

  part(name) {
    /* 没登记的部件回落到裸套件的属性写法，驼峰转 kebab，与 HTML 习惯一致 */
    const kebab = String(name).replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
    return this.PART[name] || "[" + Tenon.attr("part") + '="' + kebab + '"]';
  },

  node(name, tag) {
    const el = document.createElement(tag || "div");
    if (this.CLASS[name]) el.className = this.CLASS[name];
    return el;
  },

  /* 图标走 Font Awesome，换图标库只改这里 */
  ICON: {
    fold: "fa-solid fa-outdent",
    unfold: "fa-solid fa-indent"
  },

  icon(name) {
    return this.ICON[name] || "";
  },

  /* ---------------- 外壳骨架 ---------------- */

  tpl(name, d) {
    d = d || {};
    switch (name) {
      case "tab":
        return `<span>${tnEsc(d.title)}</span>` +
          (d.fixed ? ""
            : `<span class="tab-close" data-tab-close="${tnEsc(d.id)}">×</span>`);

      case "crumb":
        return (d.group ? `<span class="crumb-link">${tnEsc(d.group)}</span><span class="crumb-sep">/</span>` : "")
          + `<span class="crumb-cur">${tnEsc(d.title)}</span>`;

      case "empty":
        return `<div class="empty">${tnEsc(d.text || "")}</div>`;

      case "divider":
        return `<div class="dropdown-divider"></div>`;

      case "pickItem":
        return `<div class="dropdown-item tab-pick${d.active ? " active" : ""}" data-pick="${tnEsc(d.id)}">
          <span class="tab-pick-title">${tnEsc(d.title)}</span>` +
          (d.closable
            ? `<span class="tab-pick-close" data-pick-close="${tnEsc(d.id)}" title="${tnT("common.close")}">×</span>`
            : "") +
          `</div>`;

      case "pickAction":
        return `<button class="dropdown-item${d.disabled ? " disabled" : ""}" data-pick-act="${tnEsc(d.act)}"${d.disabled ? " disabled" : ""}>${tnEsc(d.text)}</button>`;

      case "ctxItem":
        return `<button class="dropdown-item${d.disabled ? " disabled" : ""}" data-ctx="${tnEsc(d.act)}"${d.disabled ? " disabled" : ""}>
          <span>${tnEsc(d.text)}</span>` +
          (d.key ? `<span class="dd-key">${tnEsc(d.key)}</span>` : "") +
          `</button>`;

      case "flyout":
        return `<div class="flyout-title">${tnEsc(d.title)}</div>`
          + (d.items || []).map((it) =>
            `<a href="${tnEsc(it.url)}" class="flyout-item${it.active ? " active" : ""}" data-view="${tnEsc(it.id)}">${tnEsc(it.text)}</a>`
          ).join("");

      case "themeDrawer":
        return `<div class="theme-hd">
            <span>${tnT("theme.title")}</span>
            <button class="theme-close" data-close aria-label="${tnT("common.close")}">×</button>
          </div>
          <div class="theme-bd">
            <div class="theme-section">
              <div class="theme-label">${tnT("theme.color")}</div>
              <div class="swatches">
                ${(d.presets || []).map(([name, color]) =>
                  `<button class="swatch" data-color="${tnEsc(color)}" title="${tnEsc(name)}">
                    <i style="background:${tnEsc(color)}"></i><span>${tnEsc(name)}</span>
                  </button>`).join("")}
              </div>
              <div class="theme-note">${tnT("theme.noteColor")}</div>
            </div>
            <div class="theme-section">
              <div class="theme-label">${tnT("theme.custom")}</div>
              <div class="theme-custom">
                <input type="color" data-picker value="${tnEsc(d.current)}" aria-label="${tnT("theme.pick")}">
                <input class="input theme-hex" value="${tnEsc(String(d.current || "").toUpperCase())}" readonly>
              </div>
              <div class="theme-note">${tnT("theme.noteCustom")}</div>
            </div>
          </div>
          <div class="theme-ft">
            <button class="btn btn-text" data-reset>${tnT("theme.reset")}</button>
            <span class="tiny muted">${tnT("kit.antdTheme")}</span>
          </div>`;

      default:
        return "";
    }
  },

  /* ---------------- 片段 ---------------- */

  pager(page, pages, total) {
    const nums = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    }
    let mid = "";
    nums.forEach((n, i) => {
      const prev = nums[i - 1];
      if (prev && n - prev > 1) mid += `<span class="pager-gap">…</span>`;
      mid += `<button class="pager-btn ${n === page ? "active" : ""}" data-page="${n}">${n}</button>`;
    });
    return `<div class="pager">
      <span class="pager-info">${tnT("pager.total", { n: total })}</span>
      <button class="pager-btn ${page <= 1 ? "disabled" : ""}" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>${tnT("pager.prev")}</button>
      ${mid}
      <button class="pager-btn ${page >= pages ? "disabled" : ""}" data-page="${page + 1}" ${page >= pages ? "disabled" : ""}>${tnT("pager.next")}</button>
    </div>`;
  },

  count(total) {
    return `<span class="pager-info">${tnT("pager.total", { n: total })}</span>`;
  },

  tag(text, type = "default") {
    return `<span class="tag tag-${tnEsc(type)}">${tnEsc(text)}</span>`;
  },

  emptyRow(colspan) {
    return `<tr><td colspan="${colspan || 1}" class="empty-cell">${tnT("table.empty")}</td></tr>`;
  },

  confirm(content) {
    return `<div class="confirm"><span class="confirm-icon">!</span><div>${content}</div></div>`;
  },

  /* ---------------- 节点 ---------------- */

  toast(message, type = "success") {
    const MARK = { success: ["toast-ok", "✓"], info: ["toast-info", "i"], error: ["toast-err", "!"] };
    const kind = MARK[type] || MARK.success;
    const node = document.createElement("div");
    node.className = "toast";
    node.innerHTML = `<span class="toast-mark ${kind[0]}">${kind[1]}</span><span>${tnEsc(message)}</span>`;
    return node;
  },

  modal(o) {
    const mask = document.createElement("div");
    mask.className = "modal-mask";
    mask.innerHTML = `<div class="modal" role="dialog" aria-modal="true" style="width:${o.width || 480}px">
      <div class="modal-hd">
        <span class="modal-title">${tnEsc(o.title || "")}</span>
        <button class="modal-close" data-close aria-label="${tnT("common.close")}">×</button>
      </div>
      <div class="modal-bd" tn-data-modal-body></div>
      <div class="modal-ft">
        ${o.hideCancel ? "" : `<button class="btn btn-default" data-cancel>${tnEsc(o.cancelText || tnT("ui.cancel"))}</button>`}
        <button class="btn ${o.danger ? "btn-danger-solid" : "btn-primary"}" data-ok>${tnEsc(o.okText || tnT("ui.ok"))}</button>
      </div>
    </div>`;
    return mask;
  },

  loading(text) {
    const mask = document.createElement("div");
    mask.className = "tn-loading-mask";
    mask.innerHTML = `<div class="tn-loading"><span class="tn-spinner"></span><span>${tnEsc(text || tnT("ui.loading"))}</span></div>`;
    return mask;
  },

  menu(items) {
    const box = document.createElement("div");
    box.className = "dropdown";
    box.innerHTML = items
      .map(
        (it, i) =>
          `<button class="dropdown-item ${it.danger ? "danger" : ""}" tn-data-menu-item>${tnEsc(it.text)}</button>`
      )
      .join("");
    return box;
  }
});

/* ======================== ui/tenon.ui.js ======================== */
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

/* ======================== shell/tenon.ajax.js ======================== */
/* ===========================================================
   tenon.ajax.js — 页面片段加载 / 脚本按需加载 / 框架响应协议
   -----------------------------------------------------------
   这是“HTML 页面”路线的关键一层：页签内容不再是 JS 拼字符串，
   而是 fetch 一个真实的 HTML 片段（pages/*.html）。

   片段约定：
     · 无 html/head/body，只有一个根元素
     · 根元素带 data-page="<id>"，可选 data-script="<name>"
       → 自动加载 pages-script/<name>.js
     · 也可用 data-url 覆盖默认取数地址（接真实后端时用）

   响应协议（沿用既有约定，视图层不感知后端）：
     { statusCode:"200", message, callbackType, navTabId }
     callbackType: closeCurrent | refreshCurrent | none
   =========================================================== */
Tenon.ajax = (function () {
  const { qs } = Tenon.core;

  /* ---------------- 脚本按需加载 ---------------- */

  const loaded = new Map();      // src -> Promise

  function require(src) {
    if (loaded.has(src)) return loaded.get(src);
    const p = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = () => resolve(src);
      s.onerror = () => reject(new Error(Tenon.i18n.t("ajax.scriptFail", { src })));
      document.head.appendChild(s);
    });
    loaded.set(src, p);
    return p;
  }

  /* ---------------- 片段加载 ---------------- */

  /** 取 HTML 片段文本；失败抛错，由调用方渲染错误块 */
  async function fetchPage(url) {
    const res = await fetch(url, { headers: { "X-Requested-With": "XMLHttpRequest" } });
    if (!res.ok) throw new Error(Tenon.i18n.t("ajax.pageFail", { status: res.status, url }));
    return res.text();
  }

  /** 把片段文本解析成节点，并返回根元素与它的声明信息 */
  function parse(html, fallbackId) {
    const box = document.createElement("div");
    box.innerHTML = html.trim();
    const root = box.firstElementChild;
    if (!root) throw new Error(Tenon.i18n.t("ajax.emptyPage"));
    return {
      root,
      id: root.dataset.page || fallbackId,
      script: root.dataset.script || ""
    };
  }

  /**
   * 加载并初始化一个页面片段到容器
   * @param {Element} holder 承载节点（页签容器）
   * @param {string} url 片段地址
   * @param {string} id 页签 id（片段没写 data-page 时兜底）
   * @returns {Promise<{root:Element,id:string}>}
   */
  async function loadInto(holder, url, id) {
    holder.innerHTML = Tenon.kit.tpl("empty", { text: Tenon.i18n.t("empty.loading") });
    let parsed;
    try {
      parsed = parse(await fetchPage(url), id);
    } catch (err) {
      holder.innerHTML = Tenon.kit.tpl("empty", { text: err.message });
      throw err;
    }
    holder.innerHTML = "";
    holder.appendChild(parsed.root);

    Tenon.init(holder);                       // 控件先就位
    if (parsed.script) {
      try {
        await require("pages-script/" + parsed.script + ".js");
        const boot = Tenon.page[parsed.script];
        if (typeof boot === "function") boot(parsed.root);
        else if (boot && typeof boot.init === "function") boot.init(parsed.root);
      } catch (err) {
        console.error("[tenon:page] 页面脚本失败 " + parsed.script, err);
      }
    }
    return parsed;
  }

  /* ---------------- 页面脚本注册 ---------------- */

  Tenon.page = Tenon.page || {};
  Tenon.page.define = function (name, init) { Tenon.page[name] = init; return init; };

  /* ---------------- 请求器：宿主注入 ---------------- */

  /**
   * get / post 是「请求器」，不是框架写死的实现。
   * 框架只负责两件事：加载页面片段（loadInto），以及消化响应协议（handle）。
   * 数据从哪来，由宿主决定 —— 可以接真实 fetch、axios，也可以接 mock。
   *
   * 默认实现走 window.fetch，接真实后端；demo 在 mock/db.js 里用自己的
   * 实现覆盖了 Tenon.ajax.get / Tenon.ajax.post（读 MOCK_ROUTES）。
   */
  async function get(url, params) {
    const qs = params
      ? "?" + Object.entries(params).map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&")
      : "";
    const res = await fetch(url + qs, { headers: { "X-Requested-With": "XMLHttpRequest" } });
    if (!res.ok) return { statusCode: String(res.status), message: Tenon.i18n.t("ajax.requestFailCode", { status: res.status }) };
    try { return await res.json(); } catch (e) { return { statusCode: "200", message: "OK" }; }
  }

  async function post(url, data) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify(data || {})
    });
    if (!res.ok) return { statusCode: String(res.status), message: Tenon.i18n.t("ajax.requestFailCode", { status: res.status }) };
    try { return await res.json(); } catch (e) { return { statusCode: "200", message: "OK" }; }
  }

  /**
   * 统一处理框架响应协议
   * @param {object} res 服务端响应
   * @param {object} ctx { tabId, skipRefresh }
   *   tabId       —— closeCurrent 用
   *   skipRefresh —— true 时不执行 navTabId 刷新（页面自己更新了 DOM）
   */
  function handle(res, ctx = {}) {
    const ok = res && String(res.statusCode) === "200";
    if (!ok) {
      Tenon.ui.toast((res && res.message) || Tenon.i18n.t("ajax.requestFail"), "error");
      return false;
    }
    if (res.message) Tenon.ui.toast(res.message);
    if (res.callbackType === "closeCurrent" && ctx.tabId) Tenon.navtab.close(ctx.tabId);
    if (res.callbackType === "refreshCurrent" && !ctx.skipRefresh) Tenon.navtab.refresh(Tenon.navtab.currentId());
    if (res.navTabId && !ctx.skipRefresh) Tenon.navtab.refreshOrOpen(res.navTabId);
    return true;
  }

  return { require, fetchPage, parse, loadInto, get, post, handle };
})();

/* ======================== ui/tenon.popover.js ======================== */
/* ===========================================================
   tenon.popover.js — 「触发器 + 浮层」的公共开关
   -----------------------------------------------------------
   select / cascader 这类控件都是同一个动作：
     点触发器弹出面板 → 点面板外收起 → Esc 收起 → aria-expanded 跟着变
   这套行为必须一致，所以只写一遍：

     const pop = Tenon.popover({
       wrap,                // 包住 trigger 与 panel 的容器
       trigger,
       panel,
       onOpen() { … },      // 打开前填内容（渲染列表 / 定位到已选项）
       onClose() { … }      // 收起后清理
     });

     pop.show(); pop.hide(); pop.toggle(); pop.isOpen(); pop.destroy();

   状态仍然走 kit：panel 用 hidden、trigger 用 open，类名归皮肤。
   点外面判断用捕获阶段的 pointerdown —— 比 click 早，面板刚打开时的
   那次点击不会误关。
   =========================================================== */
Tenon.popover = (function () {
  const kit = () => Tenon.kit;

  function create(opt) {
    const { wrap, trigger, panel } = opt;
    let opened = false;

    function onDocDown(e) {
      if (!wrap.contains(e.target)) hide();
    }

    function onKey(e) {
      if (e.key === "Escape" && opened) {
        hide();
        trigger.focus();
      }
    }

    function show() {
      if (opened) return;
      if (opt.onOpen) opt.onOpen();
      kit().setState(panel, "hidden", false);
      kit().setState(trigger, "open", true);
      trigger.setAttribute("aria-expanded", "true");
      document.addEventListener("pointerdown", onDocDown, true);
      document.addEventListener("keydown", onKey);
      opened = true;
    }

    function hide() {
      if (!opened) return;
      kit().setState(panel, "hidden", true);
      kit().setState(trigger, "open", false);
      trigger.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", onDocDown, true);
      document.removeEventListener("keydown", onKey);
      opened = false;
      if (opt.onClose) opt.onClose();
    }

    return {
      show,
      hide,
      toggle() { if (opened) hide(); else show(); },
      isOpen: () => opened,
      destroy() { hide(); }
    };
  }

  return { create };
})();

/* ======================== ui/tenon.dropdown.js ======================== */
/* ===========================================================
   tenon.dropdown.js — 下拉菜单
   -----------------------------------------------------------
   两种用法：

   1) 声明式（菜单内容是临时生成的项列表）
      <button tn-data-dropdown="编辑|复制|删除">更多操作 ▾</button>
      → 点击在按钮下方弹出，最后一项标记为 danger

   2) 命令式（面板节点已在 HTML 里，或由脚本创建）
      Tenon.dropdown.open(triggerEl, panelEl)
      Tenon.dropdown.close()

   面板统一 position:fixed + 视口夹取，右对齐更稳。
   =========================================================== */
Tenon.dropdown = (function () {
  let panel = null, trigger = null, throwaway = false;

  function place(t, p) {
    const r = t.getBoundingClientRect();
    const w = p.offsetWidth, h = p.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const alignRight = p.dataset.align !== "left";
    let left = alignRight ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, vw - w - 8));
    let top = r.bottom + 6;
    if (top + h > vh - 8) top = Math.max(8, r.top - h - 6);
    p.style.left = left + "px";
    p.style.top = top + "px";
  }

  function open(t, p) {
    close();
    panel = p;
    trigger = t;
    Tenon.kit.setState(p, "hidden", false);
    place(t, p);
    if (t.hasAttribute("aria-expanded")) t.setAttribute("aria-expanded", "true");
  }

  function close() {
    if (!panel) return;
    Tenon.kit.setState(panel, "hidden", true);
    if (trigger && trigger.hasAttribute("aria-expanded")) trigger.setAttribute("aria-expanded", "false");
    if (throwaway) panel.remove();
    panel = null;
    trigger = null;
    throwaway = false;
  }

  const isOpen = () => !!panel && !Tenon.kit.hasState(panel, "hidden");

  /* 全局收起：点空白 / Esc / 滚动 / 改窗口 */
  document.addEventListener("mousedown", (e) => {
    if (!isOpen()) return;
    if (panel.contains(e.target)) return;
    if (trigger && trigger.contains(e.target)) return;
    close();
  });
  document.addEventListener("keydown", (e) => {
    if (isOpen() && e.key === "Escape") close();
  });
  document.addEventListener("scroll", () => close(), true);
  window.addEventListener("resize", () => close());

  /* ---------------- 声明式 ---------------- */

  Tenon.component("dropdown", {
    selector: "[tn-data-dropdown]",

    init(btn) {
      const off = Tenon.core.on(btn, "click", "[tn-data-dropdown]", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen() && trigger === btn) return close();

        const spec = btn.getAttribute(Tenon.attr("dropdown")) || "";
        const items = spec.split("|").filter(Boolean);
        const p = Tenon.kit.menu(items.map((text, i) => ({
          text,
          danger: i === items.length - 1 && items.length > 2
        })));
        document.body.appendChild(p);

        p.addEventListener("click", (ev) => {
          const item = ev.target.closest(Tenon.kit.part("dropdownItem"));
          if (!item) return;
          btn.dispatchEvent(new CustomEvent("tenon:dropdown", {
            bubbles: true, detail: { text: item.textContent.trim(), index: [...p.children].indexOf(item) }
          }));
          Tenon.ui.toast(Tenon.i18n.t("dropdown.clicked", { text: item.textContent.trim() }));
          close();
        });

        throwaway = true;
        open(btn, p);
      });

      return { destroy: off };
    },

    destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
  });

  return { open, close, isOpen };
})();

/* ======================== ui/tenon.dialog.js ======================== */
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

/* ======================== ui/tenon.tabs.js ======================== */
/* ===========================================================
   tenon.tabs.js — 选项卡
   -----------------------------------------------------------
   声明方式（状态全在 HTML 里，JS 不改初始态）：

     <div tn-data="tabs">
       <button class="tab-item active" data-tab="info">基本信息</button>
       <button class="tab-item" data-tab="param">参数配置</button>
     </div>
     <div data-pane="info">…</div>
     <div data-pane="param" class="hidden">…</div>

   容器只需声明 tn-data="tabs"，类名与本层无关。
   面板可在容器外部（选项卡条与面板常是兄弟节点）。
   =========================================================== */
Tenon.component("tabs", {
  selector: '[tn-data~="tabs"]',

  init(box) {
    const { qsa } = Tenon.core;
    /* 面板可能不在容器内部（选项卡条与面板常是兄弟节点），
       所以按钮看 box，面板看更外一层作用域 */
    const scope = box.closest(Tenon.kit.part("tabsScope")) || box.parentElement || box;
    const buttons = () => qsa("[data-tab]", box);
    const panes = () => qsa("[data-pane]", scope);

    /* 语义交给 ARIA，外观交给 kit：这两件事互不干扰。
       初始态只补语义、不动可见性 —— 可见性是 HTML 说了算。 */
    box.setAttribute("role", "tablist");
    panes().forEach((p) => p.setAttribute("role", "tabpanel"));
    (function initAria() {
      const list = buttons();
      const on = list.find((b) => Tenon.kit.hasState(b, "active"));
      list.forEach((b) => {
        const active = on ? b === on : b === list[0];
        b.setAttribute("role", "tab");
        b.setAttribute("aria-selected", b === on ? "true" : "false");
        b.setAttribute("tabindex", active ? "0" : "-1");
      });
    })();

    function select(key) {
      buttons().forEach((b) => {
        const on = b.dataset.tab === key;
        Tenon.kit.setState(b, "active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.setAttribute("tabindex", on ? "0" : "-1");     // 整条栏只有一个 Tab 落点
      });
      panes().forEach((p) => Tenon.kit.setState(p, "hidden", p.dataset.pane !== key));
      box.dispatchEvent(new CustomEvent("tenon:tab", { bubbles: true, detail: { key } }));
    }

    const off = Tenon.core.on(box, "click", "[data-tab]", (e, btn) => {
      e.preventDefault();
      select(btn.dataset.tab);
    });

    /* 方向键在选项卡之间移动（WAI-ARIA 的 tablist 惯例，随焦点自动激活） */
    const offKey = Tenon.core.on(box, "keydown", "[data-tab]", (e, btn) => {
      const list = buttons();
      const i = list.indexOf(btn);
      let to = -1;
      if (e.key === "ArrowRight") to = (i + 1) % list.length;
      else if (e.key === "ArrowLeft") to = (i - 1 + list.length) % list.length;
      else if (e.key === "Home") to = 0;
      else if (e.key === "End") to = list.length - 1;
      if (to < 0) return;
      e.preventDefault();
      select(list[to].dataset.tab);
      list[to].focus();
    });

    return {
      select,
      current: () => {
        const on = buttons().find((b) => Tenon.kit.hasState(b, "active"));
        return on ? on.dataset.tab : null;
      },
      destroy() { off(); offKey(); }
    };
  },

  destroy(node, inst) {
    if (inst && inst.destroy) inst.destroy();
  }
});

/* ======================== ui/tenon.switch.js ======================== */
/* ===========================================================
   tenon.switch.js — 开关
   -----------------------------------------------------------
   <button tn-data="switch" aria-checked="true"><span class="switch-dot"></span></button>
   切换后派发 change 事件，页面脚本可监听：
     el.addEventListener("change", e => e.detail.on)
   开关态由 Tenon.kit 决定。
   =========================================================== */
Tenon.component("switch", {
  selector: '[tn-data~="switch"]',

  init(btn) {
    function set(on, silent) {
      Tenon.kit.setState(btn, "on", !!on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
      if (!silent) btn.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { on: !!on } }));
    }
    set(Tenon.kit.hasState(btn, "on"), true);
    btn.setAttribute("role", "switch");

    const off = Tenon.core.on(btn, "click", '[tn-data~="switch"], ' + Tenon.kit.part("switchDot"), (e) => {
      e.preventDefault();
      set(!Tenon.kit.hasState(btn, "on"));
    });

    return { set, isOn: () => Tenon.kit.hasState(btn, "on"), destroy: off };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});

/* ======================== ui/tenon.collapse.js ======================== */
/* ===========================================================
   tenon.collapse.js — 折叠面板
   -----------------------------------------------------------
   <div class="a-collapse" tn-data="collapse">
     <div class="a-collapse-item open">
       <button class="a-collapse-hd" data-collapse><span>标题</span><span class="caret">▶</span></button>
       <div class="a-collapse-bd">…</div>
     </div>
   </div>

   容器加 tn-data-accordion 则同时只展开一个（手风琴模式）。
   =========================================================== */
Tenon.component("collapse", {
  selector: '[tn-data~="collapse"]',

  init(box) {
    const single = box.hasAttribute("tn-data-accordion");
    const ITEM = Tenon.kit.part("collapseItem");

    const off = Tenon.core.on(box, "click", "[data-collapse]", (e, hd) => {
      e.preventDefault();
      const item = hd.closest(ITEM);
      if (!item) return;
      const willOpen = !Tenon.kit.hasState(item, "open");
      if (single && willOpen) {
        Tenon.core.qsa(ITEM, box).forEach((it) => Tenon.kit.setState(it, "open", false));
      }
      Tenon.kit.setState(item, "open", willOpen);
      box.dispatchEvent(new CustomEvent("tenon:collapse", { bubbles: true, detail: { item, open: willOpen } }));
    });

    return { destroy: off };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});

/* ======================== ui/tenon.segmented.js ======================== */
/* ===========================================================
   tenon.segmented.js — 分段控制器
   -----------------------------------------------------------
   <div tn-data="segmented">
     <button class="active" data-seg>日</button>
     <button data-seg>周</button>
   </div>
   选中态由 Tenon.kit 决定。
   =========================================================== */
Tenon.component("segmented", {
  selector: '[tn-data~="segmented"]',

  init(box) {
    const off = Tenon.core.on(box, "click", "[data-seg]", (e, btn) => {
      e.preventDefault();
      Tenon.core.qsa("[data-seg]", box).forEach((b) => Tenon.kit.setState(b, "active", b === btn));
      box.dispatchEvent(new CustomEvent("tenon:segment", { bubbles: true, detail: { value: btn.textContent.trim(), index: Tenon.core.qsa("[data-seg]", box).indexOf(btn) } }));
    });
    return { destroy: off };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});

/* ======================== ui/tenon.rate.js ======================== */
/* ===========================================================
   tenon.rate.js — 评分
   -----------------------------------------------------------
   <div tn-data="rate">
     <i class="fa-solid fa-star on"></i> × 5
   </div>
   点击第 n 颗 → 前 n 颗点亮；派发 tenon:rate（detail.value = n）
   点亮态由 Tenon.kit 决定，控件不写类名。
   =========================================================== */
Tenon.component("rate", {
  selector: '[tn-data~="rate"]',

  init(box) {
    const stars = () => Tenon.core.qsa(Tenon.kit.part("rateStar"), box);

    function paint(n) {
      stars().forEach((s, i) => Tenon.kit.setState(s, "on", i < n));
      box.dataset.value = String(n);
    }

    paint(stars().filter((s) => Tenon.kit.hasState(s, "on")).length);

    const off = Tenon.core.on(box, "click", "i", (e, star) => {
      const n = stars().indexOf(star) + 1;
      paint(n);
      box.dispatchEvent(new CustomEvent("tenon:rate", { bubbles: true, detail: { value: n } }));
    });

    return { set: paint, value: () => Number(box.dataset.value || 0), destroy: off };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});

/* ======================== ui/tenon.optionlist.js ======================== */
/* ===========================================================
   tenon.optionlist.js — 选中列表（对应 antd 的 Menu 选中态）
   -----------------------------------------------------------
   <div tn-data="optionlist">
     <div class="a-menu-item active" data-option>用户管理</div>
     <div class="a-menu-item" data-option>系统设置</div>
   </div>
   同一容器内单选；派发 tenon:option（detail.value / index / text）
   =========================================================== */
Tenon.component("optionlist", {
  selector: '[tn-data~="optionlist"]',

  init(box) {
    const off = Tenon.core.on(box, "click", "[data-option]", (e, item) => {
      e.preventDefault();
      const all = Tenon.core.qsa("[data-option]", box);
      all.forEach((m) => Tenon.kit.setState(m, "active", m === item));
      box.dispatchEvent(new CustomEvent("tenon:option", {
        bubbles: true,
        detail: { index: all.indexOf(item), text: item.textContent.trim(), node: item }
      }));
    });
    return { destroy: off };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});

/* ======================== ui/tenon.select.js ======================== */
/* ===========================================================
   tenon.select.js — 下拉选择（单选 / 多选 / 可搜索）
   -----------------------------------------------------------
   渐进增强：页面照常写原生 select，控件负责把它变成下拉面板。

     <select tn-data="select" multiple data-placeholder="选择成员" data-search>
       <option value="1">张伟</option>
       <option value="2" selected>李娜</option>
       <option value="3" disabled>王强（停用）</option>
     </select>

   为什么要留着原生 select：
     · new FormData(form) 照旧能拿到值，表单校验、提交一行都不用改
     · 关掉 JS 时它还是个能用的 select
   控件只是把它隐藏，再把选中状态同步回去（option.selected）。

   属性：
     multiple         多选
     data-placeholder 未选时的提示文案
     data-search      显示搜索框（多选默认开）

   事件：
     change（原生）  —— 选中变化后派发，FormData 与老代码都能感知
     tenon:select    —— detail { values, value, options }

   实例 API：open / close / get / set / refresh / destroy
   =========================================================== */
Tenon.component("select", {
  selector: 'select[tn-data~="select"]',

  init(sel) {
    const kit = () => Tenon.kit;

    const multiple = sel.multiple;
    /* 可能是 i18n 默认值，切语言时要能跟着变，所以是 let */
    let placeholderText = sel.dataset.placeholder || Tenon.i18n.t("select.placeholder");
    const searchable = sel.hasAttribute("data-search") || multiple;

    /* ---------------- 骨架 ---------------- */

    const wrap = kit().node("select", "div");
    const trigger = kit().node("selectTrigger", "button");
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const panel = kit().node("selectPanel", "div");
    kit().setState(panel, "hidden", true);

    let searchInput = null;
    if (searchable) {
      const box = kit().node("selectSearch", "div");
      searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = Tenon.i18n.t("select.search");
      searchInput.setAttribute("aria-label", Tenon.i18n.t("select.search"));
      box.appendChild(searchInput);
      panel.appendChild(box);
    }

    const list = document.createElement("div");
    list.setAttribute("role", "listbox");
    if (multiple) list.setAttribute("aria-multiselectable", "true");
    panel.appendChild(list);

    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    sel.hidden = true;
    sel.setAttribute("tabindex", "-1");

    /* ---------------- 渲染 ---------------- */

    const options = () => Array.from(sel.options);
    /* 空值选项（<option value="">请选择</option>）算「未选」，
       否则原生 select 默认选中首项，占位文案永远露不出来 */
    const picked = () => options().filter((o) => o.selected && !o.disabled && o.value !== "");
    const query = () => (searchInput ? searchInput.value : "");

    function renderTrigger() {
      const chosen = picked();
      trigger.innerHTML = "";

      if (!chosen.length) {
        const span = kit().node("selectValue", "span");
        span.textContent = placeholderText;
        trigger.appendChild(span);
        kit().setState(trigger, "placeholder", true);
        return;
      }
      kit().setState(trigger, "placeholder", false);

      if (multiple) {
        chosen.forEach((o) => {
          const tag = kit().node("selectTag", "span");
          const text = document.createElement("span");
          text.textContent = o.textContent;
          const x = document.createElement("i");
          x.dataset.tagRemove = o.value;
          x.textContent = "×";
          tag.appendChild(text);
          tag.appendChild(x);
          trigger.appendChild(tag);
        });
      } else {
        const span = kit().node("selectValue", "span");
        span.textContent = chosen[0].textContent;
        trigger.appendChild(span);
      }
    }

    function renderList() {
      const q = String(query()).trim().toLowerCase();
      list.innerHTML = "";
      options().forEach((o, i) => {
        const btn = kit().node("selectOption", "button");
        btn.type = "button";
        btn.dataset.optionIndex = String(i);
        btn.textContent = o.textContent;
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-selected", o.selected ? "true" : "false");
        if (o.selected) kit().setState(btn, "active", true);
        if (o.disabled) {
          kit().setState(btn, "disabled", true);
          btn.disabled = true;
        }
        if (q && !o.textContent.toLowerCase().includes(q)) kit().setState(btn, "hidden", true);
        list.appendChild(btn);
      });
    }

    /* ---------------- 交互 ---------------- */

    const pop = Tenon.popover.create({
      wrap, trigger, panel,
      onOpen() {
        renderList();
        if (searchInput) { searchInput.focus(); return; }
        const first = Tenon.core.qsa(kit().part("selectOption"), list)
          .filter((b) => !kit().hasState(b, "hidden"));
        const target = first.find((b) => kit().hasState(b, "active")) || first[0];
        if (target) target.focus();
      }
    });
    const isOpen = pop.isOpen;

    function commit() {
      const chosen = picked();
      const values = chosen.map((o) => o.value);
      renderTrigger();
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      sel.dispatchEvent(new CustomEvent("tenon:select", {
        bubbles: true,
        detail: { values, value: multiple ? values : (values[0] || ""), options: chosen }
      }));
    }

    function choose(index) {
      const opt = sel.options[index];
      if (!opt || opt.disabled) return;
      if (multiple) {
        opt.selected = !opt.selected;
        renderList();
        commit();
      } else {
        options().forEach((o, i) => { o.selected = i === index; });
        renderList();
        commit();
        pop.hide();
      }
    }

    const offTrigger = Tenon.core.on(trigger, "click", "*", (e) => {
      if (e.target.closest("[data-tag-remove]")) return;   // 删标签不切换面板
      pop.toggle();
    });

    const offPanel = Tenon.core.on(panel, "click", "[data-option-index]", (e, btn) => {
      e.preventDefault();
      choose(Number(btn.dataset.optionIndex));
    });

    const offRemove = Tenon.core.on(trigger, "click", "[data-tag-remove]", (e, i) => {
      e.preventDefault();
      e.stopPropagation();
      const opt = options().find((o) => o.value === i.dataset.tagRemove);
      if (!opt) return;
      opt.selected = false;
      renderTrigger();
      if (isOpen()) renderList();
      commit();
    });

    const offSearch = searchInput
      ? Tenon.core.on(searchInput, "input", "*", () => renderList())
      : () => {};

    /** 键盘可达：↑↓ / Home / End 在可见项之间移动焦点，Enter 由 button 原生触发 */
    const visible = () => Tenon.core.qsa(kit().part("selectOption"), list)
      .filter((b) => !kit().hasState(b, "hidden"));

    const offKeys = Tenon.core.on(panel, "keydown", "*", (e) => {
      const items = visible();
      if (!items.length) return;
      const i = items.indexOf(document.activeElement);
      let to = -1;
      if (e.key === "ArrowDown") to = i < 0 ? 0 : Math.min(i + 1, items.length - 1);
      else if (e.key === "ArrowUp") to = i < 0 ? items.length - 1 : Math.max(i - 1, 0);
      else if (e.key === "Home") to = 0;
      else if (e.key === "End") to = items.length - 1;
      if (to < 0) return;
      e.preventDefault();
      items[to].focus();
    });

    const onLang = () => {
      placeholderText = sel.dataset.placeholder || Tenon.i18n.t("select.placeholder");
      if (searchInput) {
        searchInput.placeholder = Tenon.i18n.t("select.search");
        searchInput.setAttribute("aria-label", Tenon.i18n.t("select.search"));
      }
      renderTrigger();
      if (pop.isOpen()) renderList();
    };
    document.addEventListener("tenon:lang", onLang);

    renderTrigger();
    renderList();

    return {
      open: pop.show,
      close: pop.hide,
      isOpen: pop.isOpen,
      get: () => (multiple ? picked().map((o) => o.value) : (picked()[0] ? picked()[0].value : "")),
      set(values) {
        const want = [].concat(values).map(String);
        options().forEach((o) => { o.selected = want.includes(o.value); });
        renderList();
        commit();
      },
      refresh() { renderTrigger(); renderList(); },

      destroy() {
        offTrigger(); offPanel(); offRemove(); offSearch(); offKeys();
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

/* ======================== ui/tenon.cascader.js ======================== */
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

/* ======================== ui/tenon.upload.js ======================== */
/* ===========================================================
   tenon.upload.js — 文件选择（点击 / 拖拽 / 限制 / 列表）
   -----------------------------------------------------------
   还是「增强原生元素」那一套：页面写原生 file input，控件接管交互。

     <input type="file" tn-data="upload" multiple
            data-accept-hint="支持 png / pdf"
            data-max-size="5"      <!-- 单个文件上限，单位 MB -->
            data-max-count="5">    <!-- 最多几个 -->

   为什么留着原生 input：
     · new FormData(form) 照旧拿到文件，提交逻辑一行都不用改
     · 关掉 JS 时它还是个能用的文件选择框

   控件自己维护一份文件数组（原生 FileList 只读，删不掉单个文件），
   每次变更后尽力同步回 input.files —— 同步不了也不影响 inst.files 与事件。

   注意：这里只管「选」，不管「传」。上传是宿主的事（进度、分片、直传都不一样）。

   事件：change（原生）/ tenon:upload { files, rejected }
   实例 API：files() / clear() / add(fileList) / remove(index) / destroy()
   =========================================================== */
Tenon.component("upload", {
  selector: 'input[type="file"][tn-data~="upload"]',

  init(input) {
    const kit = () => Tenon.kit;
    const T = (k, v) => Tenon.i18n.t(k, v);

    const multiple = input.multiple;
    const maxSize = (Number(input.dataset.maxSize) || 0) * 1024 * 1024;   // 0 = 不限
    const maxCount = Number(input.dataset.maxCount) || (multiple ? 0 : 1);
    const acceptHint = input.dataset.acceptHint || "";

    let files = [];        // 我们的真源；FileList 不可变，删不了单个
    let rejected = [];     // 最近一次被拒的文件，随事件一起给出

    /* ---------------- 骨架 ---------------- */

    const wrap = kit().node("upload", "div");
    const zone = kit().node("uploadZone", "button");
    zone.type = "button";

    const hint = document.createElement("span");
    zone.appendChild(hint);

    const list = kit().node("uploadList", "ul");
    kit().setState(list, "hidden", true);

    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    wrap.appendChild(zone);
    wrap.appendChild(list);
    input.hidden = true;                  // 还在 form 里，只是不显示原生那套 UI

    /* ---------------- 渲染 ---------------- */

    function humanSize(bytes) {
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / 1024 / 1024).toFixed(1) + " MB";
    }

    function paintHint() {
      const bits = [T("upload.hint")];
      const limits = [];
      if (maxCount) limits.push(T("upload.limitCount", { n: maxCount }));
      if (maxSize) limits.push(T("upload.limitSize", { n: Math.round(maxSize / 1024 / 1024) }));
      if (limits.length) bits.push("（" + limits.join("，") + "）");
      if (acceptHint) bits.push(" " + acceptHint);
      hint.textContent = bits.join("");
    }

    function paintList() {
      list.innerHTML = "";
      kit().setState(list, "hidden", files.length === 0);
      files.forEach((f, i) => {
        const li = kit().node("uploadItem", "li");

        const name = kit().node("uploadName", "span");
        name.textContent = f.name;

        const size = kit().node("uploadSize", "span");
        size.textContent = humanSize(f.size);

        const del = kit().node("uploadRemove", "button");
        del.type = "button";
        del.dataset.index = String(i);
        del.setAttribute("aria-label", T("upload.remove"));
        del.textContent = "×";

        li.appendChild(name);
        li.appendChild(size);
        li.appendChild(del);
        list.appendChild(li);
      });
    }

    /** 尽量把我们的数组同步回原生 input，让 FormData 拿到文件 */
    function syncInput() {
      try {
        const dt = new DataTransfer();
        files.forEach((f) => dt.items.add(f));
        input.files = dt.files;
      } catch (e) {
        /* 个别浏览器不允许赋值，忽略：inst.files 仍然是准的 */
      }
    }

    function emit(reason) {
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new CustomEvent("tenon:upload", {
        bubbles: true,
        detail: { files: files.slice(), rejected: rejected.slice(), reason }
      }));
    }

    /* ---------------- 加文件 ---------------- */

    function add(incoming) {
      rejected = [];
      const list_ = Array.prototype.slice.call(incoming || []);

      list_.forEach((f) => {
        if (maxSize && f.size > maxSize) {
          rejected.push(f);
          Tenon.ui.toast(T("upload.tooLarge", { name: f.name, size: Math.round(maxSize / 1024 / 1024) }), "error");
          return;
        }
        if (maxCount && files.length >= maxCount) {
          rejected.push(f);
          return;
        }
        const dup = files.some((x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified);
        if (!dup) files.push(f);
      });

      if (rejected.length && files.length >= maxCount) {
        Tenon.ui.toast(T("upload.tooMany", { n: maxCount }), "error");
      }

      syncInput();
      paintList();
      if (list_.length) emit("add");
      return files.length;
    }

    /* ---------------- 交互 ---------------- */

    const offZone = Tenon.core.on(zone, "click", "*", () => input.click());

    const offChange = Tenon.core.on(input, "change", "*", () => {
      /* 用户用原生对话框选的：直接接管进数组，再清空原生选择，
         避免下次选同一个文件不触发 change */
      if (input.files && input.files.length) {
        const picked = Array.prototype.slice.call(input.files);
        if (!multiple) files = [];        // 单选：新选择替换旧的
        add(picked);                       // 多选：追加（add 里有去重）
      }
    });

    const offRemove = Tenon.core.on(list, "click", "[data-index]", (e, btn) => {
      e.preventDefault();
      const i = Number(btn.dataset.index);
      if (i >= 0 && i < files.length) {
        files.splice(i, 1);
        syncInput();
        paintList();
        emit("remove");
      }
    });

    /* 拖拽：只用 dragover 高亮 + drop 收文件，别接管整页 */
    const offOver = Tenon.core.on(zone, "dragover", "*", (e) => {
      e.preventDefault();
      kit().setState(zone, "over", true);
    });
    const offLeave = Tenon.core.on(zone, "dragleave", "*", () => {
      kit().setState(zone, "over", false);
    });
    const offDrop = Tenon.core.on(zone, "drop", "*", (e) => {
      e.preventDefault();
      kit().setState(zone, "over", false);
      const dt = e.dataTransfer;
      if (!dt || !dt.files || !dt.files.length) return;
      if (!multiple) files = [];
      add(dt.files);
    });

    /* ---------------- 收尾 ---------------- */

    paintHint();
    paintList();

    return {
      files: () => files.slice(),
      count: () => files.length,
      clear() {
        files = [];
        syncInput();
        paintList();
        emit("clear");
      },
      add,
      remove(i) {
        if (i >= 0 && i < files.length) {
          files.splice(i, 1);
          syncInput();
          paintList();
          emit("remove");
        }
      },
      destroy() {
        offZone(); offChange(); offRemove(); offOver(); offLeave(); offDrop();
        input.hidden = false;
        if (wrap.parentNode) {
          wrap.parentNode.insertBefore(input, wrap);
          wrap.remove();
        }
      }
    };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});

/* ======================== ui/tenon.tree.js ======================== */
/* ===========================================================
   tenon.tree.js — 树形菜单
   -----------------------------------------------------------
   <ul tn-data="tree">
     <li>
       <div class="tree-row active" data-node="1">
         <span class="tree-caret" data-caret="1">▶</span>
         <span class="tree-icon folder">▣</span>
         <span>华信科技集团</span>
       </div>
       <ul class="tree-children hidden">…</ul>
     </li>
   </ul>

   只做“展开 / 选中”两件事，选中后派发 tenon:tree-select，
   详情联动交给页面脚本 —— 控件不认识业务。
   =========================================================== */
Tenon.component("tree", {
  selector: '[tn-data~="tree"]',

  init(tree) {
    const ROW = Tenon.kit.part("treeRow");
    const KIDS = Tenon.kit.part("treeChildren");
    const CARET = Tenon.kit.part("treeCaret");
    const rows = () => Tenon.core.qsa(ROW, tree);

    const off = Tenon.core.on(tree, "click", ROW, (e, row) => {
      const caret = e.target.closest("[data-caret]");

      // 点箭头：只展开 / 收起，不改变选中
      if (caret && caret.dataset.caret === "1") {
        const li = row.parentElement;
        const children = li.querySelector(":scope > " + KIDS);
        if (!children) return;
        /* 当前是隐藏的，点了就要展开 —— 状态判断在前，写入在后 */
        const willOpen = Tenon.kit.hasState(children, "hidden");
        Tenon.kit.setState(children, "hidden", !willOpen);
        Tenon.kit.setState(caret, "open", willOpen);
        return;
      }
      if (caret && caret.dataset.caret === "0") return;

      rows().forEach((r) => Tenon.kit.setState(r, "active", r === row));
      tree.dispatchEvent(new CustomEvent("tenon:tree-select", {
        bubbles: true, detail: { id: row.dataset.node, text: row.textContent.trim(), row }
      }));
    });

    /** 展开到指定节点（按 data-node 逐级打开祖先） */
    function expandTo(id) {
      const target = Tenon.core.qs(`${ROW}[data-node="${id}"]`, tree);
      if (!target) return false;
      let li = target.closest("li");
      while (li) {
        const parentUl = li.parentElement.closest("li");
        if (parentUl) {
          const kids = parentUl.querySelector(":scope > " + KIDS);
          if (kids) Tenon.kit.setState(kids, "hidden", false);
          const car = parentUl.querySelector(":scope > " + ROW + " > " + CARET);
          if (car) Tenon.kit.setState(car, "open", true);
        }
        li = parentUl;
      }
      return true;
    }

    function select(id, silent) {
      const row = Tenon.core.qs(`${ROW}[data-node="${id}"]`, tree);
      if (!row) return;
      expandTo(id);
      rows().forEach((r) => Tenon.kit.setState(r, "active", r === row));
      if (!silent) {
        tree.dispatchEvent(new CustomEvent("tenon:tree-select", {
          bubbles: true, detail: { id: row.dataset.node, text: row.textContent.trim(), row }
        }));
      }
    }

    return { expandTo, select, destroy: off };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});

/* ======================== ui/tenon.table.js ======================== */
/* ===========================================================
   tenon.table.js — 数据表格（排序 / 分页 / 勾选 / 过滤）
   -----------------------------------------------------------
   声明方式：

     <table class="table table-hover" tn-data="table" data-page-size="8">
       <thead><tr>
         <th><input type="checkbox" data-check-all></th>
         <th class="th-sort" data-sort="name">姓名 <span class="th-arrow">⇅</span></th>
       </tr></thead>
       <tbody>
         <tr data-row-id="1"><td><input type="checkbox" data-check="1"></td><td>张三</td></tr>
       </tbody>
     </table>
     <div data-pager></div>

   数据来源就是 <tbody> 里已渲染的行（等价于服务端输出），
   控件只做客户端增强：排序、切页、全选、按文本过滤、列宽拖拽。
   增删行走实例 API，不依赖任何全局数据源。

   列宽拖拽默认开启，列头右缘会多一根把手（kit 造的 colResizer）。
   不想要就写 data-resize="off"；拖完派发 tenon:table-resize。

   虚拟滚动：data-virtual
     上千行只渲染可视窗口，靠上下两根占位行撑出总高度。
     需要外层容器有固定高度并 overflow-y:auto（否则退回整表渲染）。
     开了虚拟滚动就别再写 data-page-size，两者互斥。

   固定表头 / 固定列：data-sticky="head,1"
     head  —— 表头吸顶（外层容器需要有高度并 overflow:auto）
     数字 N —— 前 N 列吸附到左侧
   框架负责算每列的 left 偏移（拖完列宽会重算），长相交给皮肤。
   =========================================================== */
Tenon.component("table", {
  selector: 'table[tn-data~="table"]',

  init(table) {
    const { qsa } = Tenon.core;
    const tbody = table.tBodies[0];
    if (!tbody) return null;

    const HEAD = qsa("[data-sort]", table);
    const pageSize = Number(table.dataset.pageSize || 0);

    /** 原始行 HTML + 用于排序/过滤的纯文本 */
    const source = qsa("tr", tbody).map((tr) => ({
      id: tr.dataset.rowId || (tr.querySelector("[data-check]") || {}).dataset?.check || "",
      html: tr.outerHTML,
      text: tr.textContent.replace(/\s+/g, " ").trim(),
      cells: qsa("td", tr).map((td) => td.textContent.trim())
    }));

    let page = 1;
    let sortKey = table.dataset.sortKey || "";
    let dir = table.dataset.sortDir === "desc" ? -1 : 1;
    let filterFn = null;
    let pool = source.slice();   // 过滤后的基线；排序在 render 时叠加，二者互不覆盖

    /* 勾选状态存在这里，不依赖 DOM —— render 会重写 tbody，
       只读 DOM 的写法会让排序/翻页一操作就把选择清空。 */
    const picked = new Set();
    const rowId = (c) => String(c.dataset.check);
    qsa("[data-check]", tbody).forEach((c) => { if (c.checked) picked.add(rowId(c)); });

    /* ---------- 读取某行的排序值 ---------- */
    function cellValue(row, key) {
      const idx = HEAD.findIndex((th) => th.dataset.sort === key);
      if (idx < 0) return "";
      // 有全选框时列序会错开一位，这里按 th 在行内的真实位置取
      const ths = qsa("th", table.tHead ? table.tHead.rows[0] : table);
      const real = ths.indexOf(HEAD[idx]);
      return row.cells[real] == null ? "" : row.cells[real];
    }

    /* ---------- 排序 ---------- */
    function sortRows(list) {
      if (!sortKey) return list;
      const out = list.slice();
      out.sort((a, b) => {
        const va = cellValue(a, sortKey);
        const vb = cellValue(b, sortKey);
        const na = Number(va.replace(/[¥,\s]/g, ""));
        const nb = Number(vb.replace(/[¥,\s]/g, ""));
        const isNum = va !== "" && vb !== "" && !Number.isNaN(na) && !Number.isNaN(nb);
        const r = isNum ? na - nb : String(va).localeCompare(String(vb), "zh");
        return r * dir;
      });
      return out;
    }

    /* ---------- 箭头 ---------- */
    function paintArrows() {
      const ARROW = Tenon.kit.part("sortArrow");
      HEAD.forEach((th) => {
        const on = th.dataset.sort === sortKey;
        /* 没有箭头节点也要标状态：以前这里先 return，导致「排序了但没标记」 */
        const arrow = th.querySelector(ARROW);
        if (arrow) arrow.textContent = on ? (dir === 1 ? "▲" : "▼") : "⇅";
        Tenon.kit.setState(th, "sorted", on);
        th.setAttribute("aria-sort", on ? (dir === 1 ? "ascending" : "descending") : "none");
      });
    }

    /* ---------- 分页容器 ---------- */
    function pagerBox() {
      const sel = table.dataset.pager;
      if (sel) return Tenon.core.qs(sel);
      const wrap = table.closest(Tenon.kit.part("tableWrap")) || table;
      let box = wrap.nextElementSibling;
      if (box && box.matches("[data-pager]")) return box;
      const card = table.closest(Tenon.kit.part("card"));
      return card ? card.querySelector("[data-pager]") : null;
    }

    /* ---------- 虚拟滚动 ---------- */

    let virtualOn = table.hasAttribute("data-virtual") && !pageSize;
    let rowH = 38;            // 先猜一行高，首屏渲染后按实测修正
    let rowMeasured = false;  // 量过一次就不重量（重绘会再触发 render）
    let scroller = null;
    let vRaf = 0;

    /** 往上找真正滚动的祖先；找不到说明整页在滚，虚拟滚动没便宜可占 */
    function scrollParent(el) {
      let p = el.parentElement;
      while (p && p !== document.body && p !== document.documentElement) {
        const oy = getComputedStyle(p).overflowY;
        if (oy === "auto" || oy === "scroll" || oy === "overlay") return p;
        p = p.parentElement;
      }
      return null;
    }

    /** 当前该渲染的窗口 [start, end) */
    function virtualWindow(total) {
      if (!scroller) return { start: 0, end: total };
      const headH = table.tHead ? table.tHead.getBoundingClientRect().height : 0;
      const tableTop = table.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      const viewTop = Math.max(0, scroller.scrollTop - (tableTop + headH));
      const OVER = 6;                                    // 上下各多渲染几行，滚动时不会闪白
      const first = Math.floor(viewTop / rowH) - OVER;
      const count = Math.ceil(scroller.clientHeight / rowH) + OVER * 2;
      const start = Math.max(0, Math.min(first, Math.max(0, total - 1)));
      return { start, end: Math.min(total, start + count) };
    }

    /**
     * 量一次真实行高，跟猜的差得多就按实测值重画。
     * 放在 render 末尾调用：表格可能是 init 后才 setData 塞进数据的，
     * 那时首屏是空表，量不到行 —— 所以「量不到就下次再说」，量到就锁住。
     */
    function measureRow() {
      if (!virtualOn || rowMeasured) return;
      const tr = tbody.querySelector("tr:not([tn-data-spacer])");
      if (!tr) return;
      const h = tr.getBoundingClientRect().height;
      if (h <= 0) return;
      rowMeasured = true;                 // 先置位，避免下面的 render 再进来递归
      if (Math.abs(h - rowH) > 0.5) {
        rowH = h;
        render(true);
      }
    }

    function bindVirtual() {
      if (!virtualOn) return () => {};
      scroller = scrollParent(table);
      if (!scroller) { virtualOn = false; return () => {}; }

      const onScroll = () => {
        if (vRaf) return;
        vRaf = requestAnimationFrame(() => {
          vRaf = 0;
          render(true);          // 静默重绘：滚动不该不停派发 table-change
        });
      };
      scroller.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        scroller.removeEventListener("scroll", onScroll);
        if (vRaf) cancelAnimationFrame(vRaf);
        vRaf = 0;
        scroller = null;
      };
    }

    /* ---------- 渲染 ---------- */

    /** 列数：占位行要跨满整行 */
    const colCount = () => qsa("th", table.tHead ? table.tHead.rows[0] : table).length || 1;

    function spacer(h) {
      return h > 0
        ? `<tr tn-data-spacer><td colspan="${colCount()}" style="height:${Math.round(h)}px;padding:0;border:0"></td></tr>`
        : "";
    }

    function render(silent) {
      const list = sortRows(pool);
      const total = list.length;
      const pages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
      if (page > pages) page = pages;
      const start = pageSize ? (page - 1) * pageSize : 0;

      let rows = pageSize ? list.slice(start, start + pageSize) : list;
      let topPad = 0;
      let botPad = 0;

      if (virtualOn && total) {
        const win = virtualWindow(total);
        rows = list.slice(win.start, win.end);
        topPad = win.start * rowH;
        botPad = (total - win.end) * rowH;
      }

      tbody.innerHTML = rows.length
        ? spacer(topPad) + rows.map((r) => r.html).join("") + spacer(botPad)
        : Tenon.kit.emptyRow(colCount());

      const box = pagerBox();
      if (box && pageSize && total > pageSize) box.innerHTML = Tenon.kit.pager(page, pages, total);
      else if (box) box.innerHTML = total ? Tenon.kit.count(total) : "";

      paintArrows();
      applyPicked();
      syncCheckAll();
      paintSticky();
      measureRow();
      if (silent) return;
      table.dispatchEvent(new CustomEvent("tenon:table-change", {
        bubbles: true, detail: { page, total, pages, rows: rows.length }
      }));
    }

    /* ---------- 勾选 ---------- */

    /** 把 picked 回填到刚重建的行上 */
    function applyPicked() {
      qsa("[data-check]", tbody).forEach((c) => {
        c.checked = picked.has(rowId(c));
      });
    }

    /** 把 DOM 上的勾选收回 picked（全选/单选共用） */
    function collectPicked() {
      qsa("[data-check]", tbody).forEach((c) => {
        if (c.checked) picked.add(rowId(c));
        else picked.delete(rowId(c));
      });
    }

    const selected = () => Array.from(picked);

    function syncCheckAll() {
      const all = table.querySelector("[data-check-all]");
      if (!all) return;
      if (virtualOn) {
        const total = pool.length;
        const on = pool.filter((r) => picked.has(String(r.id))).length;
        all.checked = total > 0 && on === total;
        all.indeterminate = on > 0 && on < total;
        return;
      }
      const boxes = qsa("[data-check]", tbody);
      const on = boxes.filter((c) => c.checked).length;
      all.checked = boxes.length > 0 && on === boxes.length;
      all.indeterminate = on > 0 && on < boxes.length;
    }

    /* ---------- 事件 ---------- */
    const offSort = Tenon.core.on(table, "click", "[data-sort]", (e, th) => {
      e.preventDefault();
      const key = th.dataset.sort;
      if (sortKey === key) dir = -dir;
      else { sortKey = key; dir = 1; }
      page = 1;
      render();
    });

    const offCheck = Tenon.core.on(table, "change", "[data-check-all], [data-check]", (e, box) => {
      if (box.hasAttribute("data-check-all")) {
        if (virtualOn) {
          /* 窗口会随滚动变化，只勾当前窗口会让状态乱跳，
             所以虚拟滚动下「全选」= 选中整个筛选结果 */
          if (box.checked) pool.forEach((r) => picked.add(String(r.id)));
          else picked.clear();
          qsa("[data-check]", tbody).forEach((c) => (c.checked = box.checked));
        } else {
          qsa("[data-check]", tbody).forEach((c) => (c.checked = box.checked));
        }
      }
      collectPicked();
      syncCheckAll();
      table.dispatchEvent(new CustomEvent("tenon:table-select", { bubbles: true, detail: { selected: selected() } }));
    });

    /* 分页容器可能后建（先是空 div），所以单独维护解绑函数 */
    let pagerOff = () => {};
    const bindPager = () => {
      const box = pagerBox();
      if (!box || box.__tnPager) return;
      box.__tnPager = true;
      pagerOff = Tenon.core.on(box, "click", "[data-page]", (e, btn) => {
        e.preventDefault();
        if (btn.disabled) return;
        page = Math.max(1, Number(btn.dataset.page));
        render();
      });
    };
    bindPager();

    /* ---------- 列宽拖拽 ---------- */

    /* 一旦拖过一列，就把表格切成 fixed 布局并用 colgroup 记住每列宽度，
       否则 auto 布局下浏览器会把设定的宽度当最小值，拖不动。 */
    function colGroup() {
      let cg = table.querySelector("colgroup[tn-data-cols]");
      if (cg) return cg;
      const ths = qsa("th", table.tHead.rows[0]);
      cg = document.createElement("colgroup");
      cg.setAttribute("tn-data-cols", "");
      ths.forEach((th) => {
        const col = document.createElement("col");
        col.style.width = Math.round(th.getBoundingClientRect().width) + "px";
        cg.appendChild(col);
      });
      table.insertBefore(cg, table.firstChild);
      table.style.tableLayout = "fixed";
      return cg;
    }

    function bindResize() {
      if (table.dataset.resize === "off" || !table.tHead || !table.tHead.rows[0]) return () => {};

      const ths = qsa("th", table.tHead.rows[0]);
      const handles = ths.map((th, i) => {
        const h = Tenon.kit.node("colResizer", "span");
        h.dataset.colResize = String(i);
        h.setAttribute("aria-hidden", "true");
        // 点把手不该顺带触发排序
        h.addEventListener("click", (e) => e.stopPropagation());
        th.appendChild(h);
        return h;
      });

      let drag = null;

      function onMove(e) {
        if (!drag) return;
        const w = Math.max(48, Math.round(drag.w + e.clientX - drag.x));
        drag.cg.children[drag.i].style.width = w + "px";
        paintSticky();          // 列宽变了，固定列的 left 要重算
      }

      function onUp() {
        if (!drag) return;
        const w = Math.round(ths[drag.i].getBoundingClientRect().width);
        Tenon.kit.setState(table, "resizing", false);
        document.body.style.userSelect = "";
        const detail = { index: drag.i, width: w };
        drag = null;
        document.removeEventListener("pointermove", onMove);
        table.dispatchEvent(new CustomEvent("tenon:table-resize", { bubbles: true, detail }));
      }

      const offDown = Tenon.core.on(table, "pointerdown", "[data-col-resize]", (e, h) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const i = Number(h.dataset.colResize);
        drag = { i, x: e.clientX, w: ths[i].getBoundingClientRect().width, cg: colGroup() };
        Tenon.kit.setState(table, "resizing", true);
        document.body.style.userSelect = "none";
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp, { once: true });
      });

      return () => {
        offDown();
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        handles.forEach((h) => h.remove());
        const cg = table.querySelector("colgroup[tn-data-cols]");
        if (cg) cg.remove();
        table.style.tableLayout = "";
        document.body.style.userSelect = "";
        drag = null;
      };
    }

    /* ---------- 固定表头 / 固定列 ---------- */

    const STICKY = String(table.dataset.sticky || "")
      .split(/[,\s]+/).filter(Boolean);
    const stickyHead = STICKY.includes("head");
    const stickyCols = Number(STICKY.filter((s) => /^\d+$/.test(s))[0] || 0);

    /**
     * 给需要吸附的单元格打标记并算出 left 偏移。
     * tbody 每次 render 都会重建，所以 render 末尾必须再调一次。
     */
    function paintSticky() {
      if (!stickyHead && !stickyCols) return;
      const ths = table.tHead ? qsa("th", table.tHead.rows[0]) : [];
      if (!ths.length) return;

      /* 列左偏移按实测宽度累加：colgroup 只在拖过列宽后才存在 */
      const lefts = [];
      let acc = 0;
      ths.forEach((th) => {
        lefts.push(Math.round(acc));
        acc += th.getBoundingClientRect().width;
      });

      const apply = (cell, isHead) => {
        const i = cell.cellIndex;
        const vals = [];
        if (isHead && stickyHead) vals.push("head");
        if (i < stickyCols) {
          vals.push("col");
          cell.style.left = lefts[i] + "px";
          /* 最后一次冻结列的右缘是「接缝」，标出来让皮肤画投影，
             否则滚过去的内容会贴着冻结列，看不出分界 */
          if (i === stickyCols - 1) vals.push("edge");
        }
        if (vals.length) cell.setAttribute("tn-data-sticky", vals.join(" "));
        else {
          cell.removeAttribute("tn-data-sticky");
          cell.style.left = "";
        }
      };

      qsa("th", table).forEach((th) => apply(th, true));
      qsa("td", tbody).forEach((td) => apply(td, false));
    }

    function clearSticky() {
      qsa("[tn-data-sticky]", table).forEach((c) => {
        c.removeAttribute("tn-data-sticky");
        c.style.left = "";
      });
    }

    /* ---------- API ---------- */
    const api = {
      get data() { return source; },
      get page() { return page; },
      get size() { return pageSize; },
      get sortKey() { return sortKey; },
      select(ids) {
        picked.clear();
        [].concat(ids || []).forEach((id) => picked.add(String(id)));
        applyPicked();
        syncCheckAll();
      },
      selected,
      search(text) {
        const q = String(text || "").trim().toLowerCase();
        filterFn = q ? (row) => row.text.toLowerCase().includes(q) : null;
        pool = filterFn ? source.filter(filterFn) : source.slice();
        page = 1;
        render();
        bindPager();
      },
      filter(fn) {
        filterFn = fn;
        pool = fn ? source.filter((row, i) => fn(row, i)) : source.slice();
        page = 1;
        render();
        bindPager();
      },
      reset() {
        filterFn = null;
        pool = source.slice();
        page = 1;
        sortKey = "";
        dir = 1;
        render();
      },
      setData(rows) {
        source.length = 0;
        picked.clear();          // 换了一批数据，旧选择无意义
        rows.forEach((html) => {
          const tr = Tenon.core.el("tbody");
          tr.innerHTML = html;
          const node = tr.firstElementChild;
          source.push({
            id: node.dataset.rowId || (node.querySelector("[data-check]") || {}).dataset?.check || "",
            html: node.outerHTML,
            text: node.textContent.replace(/\s+/g, " ").trim(),
            cells: qsa("td", node).map((td) => td.textContent.trim())
          });
        });
        pool = source.slice();
        page = 1;
        rowMeasured = false;      // 换了数据，重新量一次行高
        render();
        bindPager();
      },
      add(html) { api.setData([...source.map((r) => r.html), html]); },
      remove(id) {
        picked.delete(String(id));
        const i = source.findIndex((r) => String(r.id) === String(id));
        if (i < 0) return false;
        source.splice(i, 1);
        pool = filterFn ? source.filter(filterFn) : source.slice();
        render();
        return true;
      },
      render,
      destroy() {
        offSort(); offCheck(); pagerOff(); offResize(); offVirtual(); clearSticky();
        document.removeEventListener("tenon:lang", onLang);
        const box = pagerBox();
        if (box) box.__tnPager = false;
      }
    };

    /* 切语言时自己重绘：分页器文案是渲染出来的，等下次手动翻页就太晚了 */
    const onLang = () => render(true);
    document.addEventListener("tenon:lang", onLang);

    /* 顺序有讲究：bindVirtual 必须先跑，它负责找到滚动容器；
       否则首次 render 时 scroller 还是 null，会把整表画出来。 */
    const offVirtual = bindVirtual();
    render();
    bindPager();
    const offResize = bindResize();
    return api;
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});

/* ======================== ui/tenon.form.js ======================== */
/* ===========================================================
   tenon.form.js — 表单校验与提交（框架响应协议）
   -----------------------------------------------------------
   声明方式：

     <form tn-data-validate data-action="/api/customers/save" data-tab="form">
       <label class="field">
         <span class="field-label">客户名称 <span class="req">*</span></span>
         <input class="input" name="cname" data-rule="required" data-msg="请输入客户名称">
         <span class="err-text"></span>
       </label>
       <button type="submit" class="btn btn-primary">保 存</button>
     </form>

   · data-rule 支持链式：required|phone
   · data-msg 覆盖该字段的错误文案
   · data-action 有值 → 校验通过后 POST，并按 框架响应协议处理
     （statusCode=200 / callbackType=closeCurrent / navTabId）
   · 没有 data-action → 只派发 tenon:form-submit，交给页面脚本
   =========================================================== */
Tenon.form = (function () {
  const { qsa } = Tenon.core;
  const T = (k, v) => Tenon.i18n.t(k, v);

  const CHECK = {
    required: (v) => (v.trim() ? true : T("form.required")),
    phone: (v) => (!v || /^1[3-9]\d{9}$/.test(v) || T("form.phone")),
    tel: (v) => (!v || /^[\d\s\-+()]{6,20}$/.test(v) || T("form.tel")),
    email: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || T("form.email")),
    number: (v) => (!v || !Number.isNaN(Number(v)) || T("form.number")),
    int: (v) => (!v || /^-?\d+$/.test(v) || T("form.int")),
    money: (v) => (!v || /^\d+(\.\d{1,2})?$/.test(v) || T("form.money")),
    idcard: (v) => (!v || /^\d{17}[\dXx]$/.test(v) || T("form.idcard")),
    minlen: (v, arg) => (!v || v.trim().length >= Number(arg) || T("form.minlen", { n: arg })),
    maxlen: (v, arg) => (!v || v.trim().length <= Number(arg) || T("form.maxlen", { n: arg }))
  };

  /** 校验一个字段，返回 true 或错误文案 */
  function checkField(input) {
    const rules = (input.dataset.rule || "").split("|").filter(Boolean);
    if (!rules.length) return true;
    for (const raw of rules) {
      const [name, arg] = raw.split(":");
      const fn = CHECK[name];
      if (!fn) continue;
      const r = fn(input.value, arg);
      if (r !== true) return input.dataset.msg || r;
    }
    return true;
  }

  function paint(input, msg) {
    const field = input.closest(Tenon.kit.part("field")) || input.parentElement;
    const err = field ? field.querySelector(Tenon.kit.part("errorText")) : null;
    const bad = msg !== true;
    Tenon.kit.setState(input, "error", bad);
    if (err) {
      err.textContent = bad ? msg : "";
      Tenon.kit.setState(err, "show", bad);
    }
    return !bad;
  }

  /** 校验整表，返回 { ok, data } */
  function validate(form) {
    const fields = qsa("[data-rule]", form);
    let ok = true;
    let first = null;
    fields.forEach((input) => {
      const r = checkField(input);
      if (!paint(input, r) && !first) first = input;
      if (r !== true) ok = false;
    });
    if (first) first.focus();
    return ok;
  }

  function serialize(form) {
    const data = {};
    new FormData(form).forEach((v, k) => {
      if (k in data) data[k] = [].concat(data[k], v);
      else data[k] = v;
    });
    return data;
  }

  /* ---------------- 组件 ---------------- */

  Tenon.component("form", {
    selector: "form[tn-data-validate]",

    init(form) {
      const off = Tenon.core.on(form, "submit", "form", async (e) => {
        e.preventDefault();
        if (!validate(form)) {
          Tenon.ui.toast(T("form.checkRequired"), "error");
          return;
        }
        const data = serialize(form);
        const action = form.dataset.action;

        form.dispatchEvent(new CustomEvent("tenon:form-submit", { bubbles: true, detail: { data, form } }));

        if (!action) return;
        const btn = form.querySelector("[type='submit']");
        if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = T("form.submitting"); }
        const res = await Tenon.ajax.post(action, data);
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || T("form.submit"); }
        Tenon.ajax.handle(res, { tabId: form.dataset.tab || Tenon.navtab.currentId() });
      });

      // 输入时清掉上一轮的错误提示
      const offInput = Tenon.core.on(form, "input change", "[data-rule]", (e, input) => paint(input, true));

      return {
        validate: () => validate(form),
        serialize: () => serialize(form),
        destroy() { off(); offInput(); }
      };
    },

    destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
  });

  return { validate, serialize, checkField, rules: CHECK };
})();

/* ======================== ui/tenon.chart.js ======================== */
/* ===========================================================
   纯 SVG 图表 — 柱状 / 折线 / 饼图（跟随主题色）
   =========================================================== */
Tenon.chart = (function () {
  function primaryColor() {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    return value || "#1677ff";
  }

  function bar(data, color) {
    const c = color || primaryColor();
    const W = 520, H = 210, P = 34;
    const boxW = W - P * 2, gap = boxW / data.length, bw = gap * 0.5;
    const max = Math.max(...data.map((d) => d.v)) * 1.15;
    let bars = "";
    data.forEach((d, i) => {
      const h = (H - P * 2) * d.v / max;
      const x = P + i * gap + (gap - bw) / 2;
      const y = H - P - h;
      bars += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" fill="${c}" opacity="${0.55 + 0.45 * (i + 1) / data.length}"></rect>
        <text x="${x + bw / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="#595959">${d.v}</text>
        <text x="${x + bw / 2}" y="${H - P + 18}" text-anchor="middle" font-size="11" fill="#8c8c8c">${d.k}</text>`;
    });
    let grid = "";
    for (let i = 0; i <= 3; i++) {
      const y = P + (H - P * 2) * i / 3;
      grid += `<line x1="${P}" x2="${W - P}" y1="${y}" y2="${y}" stroke="#f0f0f0"/>`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${Tenon.i18n.t("chart.bar")}">${grid}${bars}</svg>`;
  }

  function line(data) {
    const c = primaryColor();
    const W = 520, H = 210, P = 34;
    const boxW = W - P * 2, step = boxW / (data.length - 1);
    const max = Math.max(...data.map((d) => d.v)) * 1.15;
    const pts = data.map((d, i) => [P + i * step, H - P - (H - P * 2) * d.v / max]);
    const poly = pts.map((p) => p.join(",")).join(" ");
    const area = `${P},${H - P} ${poly} ${P + boxW},${H - P}`;
    let dots = "", labels = "";
    pts.forEach((p, i) => {
      dots += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#fff" stroke="${c}" stroke-width="2"/>`;
      labels += `<text x="${p[0]}" y="${H - P + 18}" text-anchor="middle" font-size="11" fill="#8c8c8c">${data[i].k}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${Tenon.i18n.t("chart.line")}">
      <polygon points="${area}" fill="${c}" opacity="0.06"/>
      <polyline points="${poly}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>
      ${dots}${labels}</svg>`;
  }

  function pie(data) {
    const W = 520, H = 230, cx = 170, cy = H / 2, r = 82;
    const colors = [primaryColor(), "#52c41a", "#faad14", "#ff4d4f", "#722ed1"];
    const total = data.reduce((s, d) => s + d.v, 0);
    let a0 = -Math.PI / 2, paths = "";
    data.forEach((d, i) => {
      const a1 = a0 + Math.PI * 2 * d.v / total;
      const at = (a) => [(cx + r * Math.cos(a)).toFixed(2), (cy + r * Math.sin(a)).toFixed(2)];
      const [x0, y0] = at(a0), [x1, y1] = at(a1);
      paths += `<path d="M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1} Z" fill="${colors[i % 5]}" opacity="0.9"/>`;
      a0 = a1;
    });
    let legend = "";
    data.forEach((d, i) => {
      legend += `<g transform="translate(320,${64 + i * 30})">
        <rect width="10" height="10" rx="2" fill="${colors[i % 5]}"/>
        <text x="18" y="9" font-size="12" fill="#595959">${d.k}</text>
        <text x="150" y="9" font-size="12" fill="#8c8c8c" text-anchor="end">${d.v}</text></g>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${Tenon.i18n.t("chart.pie")}">${paths}${legend}</svg>`;
  }

  return { bar, line, pie };
})();

/* ======================== shell/tenon.navtab.js ======================== */
/* ===========================================================
   tenon.navtab.js — 页签系统（打开 / 激活 / 刷新 / 关闭 / 右键）
   -----------------------------------------------------------
   与旧版的区别：open() 不再调 view.render()，
   而是让 tenon.ajax 去取 pages/<id>.html 真实片段。

   约定：
     · view 只在页签创建时加载一次；refresh 会销毁控件后重新取片段
     · 首页常驻，不可关闭；id 由 #tabbar[data-home] 指定（默认 dashboard）
     · 页签条不出滚动条：超宽用左右箭头 + ⋮ 全部标签页
     · 可选：给 #tabbar 加 data-sync="hash" 后，当前页签与地址栏 #/id 双向同步，
       刷新页面、收藏、前进后退都能回到原来那一页

   类名一个都不写：状态交给 Tenon.kit.setState，
   页签 / 面包屑 / 飞出层 / 菜单项的标记交给 Tenon.kit.tpl，
   换皮肤只换 kit 与 CSS，本文件不用动。
   这里只守两样东西 —— id 契约（#tabbar / #workarea / #crumb / #tab-more）
   与 data-* 契约（data-tab-id / data-tab-close / data-pick / data-ctx …）。
   =========================================================== */
Tenon.navtab = (function () {
  const { qs } = Tenon.core;
  const kit = () => Tenon.kit;
  const tabs = new Map();
  let bar = null, area = null, current = null;
  let ctx = null, ctxTabId = null, more = null;

  const SCROLL_STEP = 220;
  /* 首页页签 id：默认 dashboard，宿主可用 #tabbar[data-home] 覆盖。
     框架不该认识某个具体页面的名字，这一项必须可配。 */
  let HOME = "dashboard";

  /* 地址栏同步（data-sync="hash"）*/
  let hashMode = false;
  let hashQuiet = false;   // 由本文件写 hash 时置位，用来吞掉自己触发的 hashchange
  let seeding = false;     // 首次进来那次不算用户切页签，用 replace 不 push

  const isFixed = (id) => id === HOME;

  /* ---------------- 地址栏 ---------------- */

  /** 从 #/users 里取出 users */
  const readHash = () => ((location.hash || "").match(/^#\/?([\w-]+)/) || [])[1] || "";

  /** 把当前页签写进地址栏；push=false 用 replace，别在历史里堆垃圾 */
  function writeHash(id, push) {
    if (!hashMode) return;
    const want = id ? "#/" + id : "";
    if ((location.hash || "").replace(/^#$/, "") === want) return;
    hashQuiet = true;
    if (push) location.hash = want;
    else history.replaceState(null, "", location.pathname + location.search + want);
  }

  function onHashChange() {
    if (hashQuiet) { hashQuiet = false; return; }
    const id = readHash();
    if (!id || id === current) return;
    if (tabs.has(id)) activate(id);
    else open(id);
  }

  function init() {
    bar = qs("#tabbar");
    if (bar && bar.dataset.home) HOME = bar.dataset.home;
    if (bar && bar.dataset.sync === "hash") {
      hashMode = true;
      window.addEventListener("hashchange", onHashChange);
    }
    area = qs("#workarea");
    bindContextMenu();
    bindScroller();
    bindLinks();
    bindMore();
    updateScroll();

    /* 切语言时，空态那句「请选择左侧菜单」也要跟着换 */
    document.addEventListener("tenon:lang", () => {
      if (area && !currentId()) showEmpty();
    });
  }

  /** 页签 id → { title, group, url }，由 tenon.accordion 扫描静态菜单建立 */
  function meta(id) {
    const m = (Tenon.menuMap && Tenon.menuMap[id]) || {};
    return {
      title: m.title || id,
      group: m.group || "",
      url: m.url || "pages/" + id + ".html"
    };
  }

  /* ---------------- 激活 / 面包屑 ---------------- */

  function activate(id) {
    current = id;
    tabs.forEach((t, key) => {
      const on = key === id;
      kit().setState(t.btn, "active", on);
      kit().setState(t.pane, "hidden", !on);
    });
    if (Tenon.accordion) Tenon.accordion.highlight(id);
    renderCrumb(id);
    updateScroll();
    writeHash(id, !seeding);
    const t = tabs.get(id);
    if (t) scrollTabIntoView(t.btn);
  }

  function renderCrumb(id) {
    const crumb = qs("#crumb");
    if (!crumb) return;
    const head = crumb.parentElement;
    if (!id) {
      crumb.innerHTML = "";
      if (head) kit().setState(head, "hidden", true);
      return;
    }
    if (head) kit().setState(head, "hidden", false);
    const m = meta(id);
    crumb.innerHTML = kit().tpl("crumb", {
      group: m.group,
      title: m.title
    });
  }

  /**
   * 全局链接委托 —— 静态 HTML 里的任何入口都能开页签：
   *   <a href="pages/users.html" data-view="users">  菜单项
   *   <a href="pages/users.html" data-goto="users">  页内跳转 / 面包屑
   *   <a href="pages/users.html">                    普通链接，按路径推断 id
   * 统一在这里拦截，tenon.accordion 只负责展示态。
   */
  function bindLinks() {
    document.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const a = e.target.closest("[data-view], [data-goto], a[href^='pages/']");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const id = a.dataset.view || a.dataset.goto
        || (href.match(/^pages\/([\w-]+)\.html/) || [])[1];
      if (!id) return;
      e.preventDefault();
      if (Tenon.accordion) Tenon.accordion.hideFlyout();
      open(id);
    });
  }

  /* ---------------- 打开 / 刷新 / 关闭 ---------------- */

  /**
   * 打开页签
   * @param {string} id 页面 id（对应 pages/<id>.html 与菜单 data-view）
   */
  async function open(id) {
    if (!id) return;
    if (tabs.has(id)) return activate(id);

    if (tabs.size === 0) area.innerHTML = "";
    const m = meta(id);
    const fixed = isFixed(id);
    const btn = kit().node("tab");
    btn.dataset.tabId = id;
    if (fixed) kit().setState(btn, "fixed", true);
    btn.innerHTML = kit().tpl("tab", { id, title: m.title, fixed });

    const pane = kit().node("pane");
    kit().setState(pane, "hidden", true);
    bar.appendChild(btn);
    area.appendChild(pane);
    tabs.set(id, { btn, pane, loading: true });

    btn.addEventListener("click", (e) => {
      if (e.target.dataset.tabClose) close(id);
      else activate(id);
    });

    activate(id);

    try {
      await Tenon.ajax.loadInto(pane, m.url, id);
    } catch (err) {
      /* 片段加载失败，错误块已渲染在 pane 内 */
    } finally {
      const t = tabs.get(id);
      if (t) t.loading = false;
      updateScroll();
    }
  }

  function refresh(id) {
    const t = tabs.get(id);
    if (!t) return;
    const m = meta(id);
    Tenon.destroy(t.pane);
    Tenon.ajax.loadInto(t.pane, m.url, id).catch(() => {});
  }

  function refreshOrOpen(id) {
    if (tabs.has(id)) refresh(id);
    else open(id);
  }

  function close(id) {
    if (isFixed(id)) return;
    const t = tabs.get(id);
    if (!t) return;
    Tenon.destroy(t.pane);
    t.btn.remove();
    t.pane.remove();
    tabs.delete(id);
    if (current === id) {
      const rest = [...tabs.keys()];
      current = null;
      if (rest.length) activate(rest[rest.length - 1]);
      else showEmpty();
    }
    updateScroll();
  }

  function closeOthers(keepId) {
    [...tabs.keys()].forEach((id) => {
      if (id !== keepId && !isFixed(id)) close(id);
    });
    if (tabs.has(keepId)) activate(keepId);
  }

  function closeAll() {
    [...tabs.keys()].forEach((id) => { if (!isFixed(id)) close(id); });
    if (tabs.has(HOME)) activate(HOME);
    else showEmpty();
    updateScroll();
  }

  function showEmpty() {
    area.innerHTML = kit().tpl("empty", { text: Tenon.i18n.t("empty.select") });
    if (Tenon.accordion) Tenon.accordion.highlight(null);
    renderCrumb(null);
    writeHash("", false);
  }

  /**
   * 语言变了：重读菜单索引，把已打开页签的标题与面包屑刷新一遍。
   * 页签标题来自菜单文字（宿主内容），所以必须由宿主先翻好菜单再叫这里。
   */
  function relabel() {
    if (Tenon.accordion && Tenon.accordion.buildIndex) Tenon.accordion.buildIndex();
    tabs.forEach((t, id) => {
      const m = meta(id);
      t.btn.innerHTML = kit().tpl("tab", { id, title: m.title, fixed: isFixed(id) });
    });
    renderCrumb(currentId());
  }

  /* ---------------- 页签条横向翻页 ---------------- */

  function updateScroll() {
    if (!bar) return;
    const prev = qs('[data-tab-scroll="-1"]');
    const next = qs('[data-tab-scroll="1"]');
    const moreBtn = qs("#tab-more");
    const wrap = bar.parentElement;
    const max = bar.scrollWidth - bar.clientWidth;
    const overflow = max > 1;

    if (wrap) kit().setState(wrap, "empty", tabs.size === 0);
    if (prev) kit().setState(prev, "hidden", !(overflow && bar.scrollLeft > 1));
    if (next) kit().setState(next, "hidden", !(overflow && bar.scrollLeft < max - 1));
    if (moreBtn) kit().setState(moreBtn, "hidden", tabs.size === 0);
  }

  function scrollTabIntoView(btn) {
    if (!btn || !bar) return;
    const max = bar.scrollWidth - bar.clientWidth;
    if (max <= 1) return;
    const pad = 8;
    const left = btn.offsetLeft - pad;
    const right = btn.offsetLeft + btn.offsetWidth + pad;
    if (left < bar.scrollLeft) {
      bar.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    } else if (right > bar.scrollLeft + bar.clientWidth) {
      bar.scrollTo({ left: Math.min(max, right - bar.clientWidth), behavior: "smooth" });
    }
  }

  function bindScroller() {
    const wrap = bar.parentElement;
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tab-scroll]");
      if (!btn) return;
      bar.scrollBy({ left: Number(btn.dataset.tabScroll) * SCROLL_STEP, behavior: "smooth" });
    });
    bar.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
  }

  /* ---------------- 全部标签页（⋮） ---------------- */

  const isOpen = (node) => !!node && !kit().hasState(node, "hidden");

  function bindMore() {
    const btn = qs("#tab-more");
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isOpen(more)) hideMore();
        else showMore();
      });
    }
  }

  function ensureMore() {
    if (more) return more;
    more = kit().node("moreMenu");
    more.setAttribute("role", "menu");
    kit().setState(more, "hidden", true);
    document.body.appendChild(more);

    more.addEventListener("click", (e) => {
      const closeBtn = e.target.closest("[data-pick-close]");
      if (closeBtn) {
        e.stopPropagation();
        close(closeBtn.dataset.pickClose);
        if (tabs.size) renderMore();
        else hideMore();
        return;
      }
      const pick = e.target.closest("[data-pick]");
      if (pick) { hideMore(); open(pick.dataset.pick); return; }

      const act = e.target.closest("[data-pick-act]");
      if (!act || kit().hasState(act, "disabled")) return;
      const kind = act.dataset.pickAct;
      hideMore();
      if (kind === "others" && current) {
        closeOthers(current);
        Tenon.ui.toast(Tenon.i18n.t("navtab.closedOthers"));
      } else if (kind === "all") {
        closeAll();
      }
    });

    document.addEventListener("pointerdown", (e) => {
      if (!isOpen(more)) return;
      if (more.contains(e.target) || e.target.closest("#tab-more")) return;
      hideMore();
    });
    document.addEventListener("keydown", (e) => {
      if (isOpen(more) && e.key === "Escape") hideMore();
    });
    document.addEventListener("scroll", hideMore, true);
    window.addEventListener("resize", hideMore);
    return more;
  }

  function renderMore() {
    const others = [...tabs.keys()].filter((k) => k !== current && !isFixed(k));
    const closable = [...tabs.keys()].filter((k) => !isFixed(k));
    const items = [...tabs.keys()].map((id) => kit().tpl("pickItem", {
      id,
      title: meta(id).title,
      active: id === current,
      closable: !isFixed(id)
    })).join("");
    more.innerHTML = items
      + kit().tpl("divider")
      + kit().tpl("pickAction", { act: "others", text: Tenon.i18n.t("navtab.closeOthers"), disabled: others.length === 0 })
      + kit().tpl("pickAction", { act: "all", text: Tenon.i18n.t("navtab.closeAll"), disabled: closable.length === 0 });
  }

  function showMore() {
    if (!tabs.size) return;
    const menu = ensureMore();
    renderMore();
    kit().setState(menu, "hidden", false);

    const r = qs("#tab-more").getBoundingClientRect();
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    const left = Math.max(8, Math.min(r.right - w, vw - w - 8));
    let top = r.bottom + 6;
    if (top + h > vh - 8) top = Math.max(8, r.top - h - 6);
    menu.style.left = left + "px";
    menu.style.top = top + "px";
  }

  function hideMore() {
    if (more) kit().setState(more, "hidden", true);
  }

  /* ---------------- 右键菜单 ---------------- */

  const CTX_ITEMS = [
    { act: "refresh", text: Tenon.i18n.t("navtab.refresh"), key: "R" },
    { act: "close", text: Tenon.i18n.t("navtab.close"), key: "W" },
    { divider: true },
    { act: "others", text: Tenon.i18n.t("navtab.closeOthers") },
    { act: "all", text: Tenon.i18n.t("navtab.closeAll") }
  ];

  function ensureCtx() {
    if (ctx) return ctx;
    ctx = kit().node("dropdown");
    ctx.setAttribute("role", "menu");
    kit().setState(ctx, "hidden", true);
    document.body.appendChild(ctx);

    ctx.addEventListener("click", (e) => {
      const item = e.target.closest("[data-ctx]");
      if (!item || kit().hasState(item, "disabled")) return;
      runCtxAction(item.dataset.ctx);
    });

    document.addEventListener("pointerdown", (e) => {
      if (isOpen(ctx) && !ctx.contains(e.target)) hideCtx();
    });
    document.addEventListener("keydown", (e) => {
      if (!isOpen(ctx)) return;
      if (e.key === "Escape") { hideCtx(); return; }
      const k = e.key.toLowerCase();
      const hit = CTX_ITEMS.find((it) => it.key && it.key.toLowerCase() === k);
      if (hit) {
        e.preventDefault();
        const btn = ctx.querySelector(`[data-ctx="${hit.act}"]`);
        if (btn && !kit().hasState(btn, "disabled")) runCtxAction(hit.act);
      }
    });
    window.addEventListener("resize", hideCtx);
    document.addEventListener("scroll", hideCtx, true);
    return ctx;
  }

  function runCtxAction(act) {
    const id = ctxTabId;
    hideCtx();
    if (!id || !tabs.has(id)) return;
    if (act === "refresh") {
      refresh(id);
      Tenon.ui.toast(Tenon.i18n.t("navtab.refreshed", { title: meta(id).title }));
    } else if (act === "close") {
      close(id);
    } else if (act === "others") {
      closeOthers(id);
      Tenon.ui.toast(Tenon.i18n.t("navtab.closedOthers"));
    } else if (act === "all") {
      closeAll();
    }
  }

  function hideCtx() {
    if (!isOpen(ctx)) return;
    kit().setState(ctx, "hidden", true);
    if (ctxTabId) {
      const t = tabs.get(ctxTabId);
      if (t) kit().setState(t.btn, "ctxTarget", false);
    }
    ctxTabId = null;
  }

  function showCtx(x, y, id) {
    const menu = ensureCtx();
    const noOthers = [...tabs.keys()].filter((k) => k !== id && !isFixed(k)).length === 0;

    menu.innerHTML = CTX_ITEMS.map((it) => it.divider
      ? kit().tpl("divider")
      : kit().tpl("ctxItem", {
          act: it.act,
          text: it.text,
          key: it.key,
          disabled: (it.act === "others" && noOthers) || (it.act === "close" && isFixed(id))
        })).join("");

    /* 连续右键另一个页签时，先把上一个的标记撤掉，别两个都亮着 */
    if (ctxTabId) {
      const prev = tabs.get(ctxTabId);
      if (prev) kit().setState(prev.btn, "ctxTarget", false);
    }
    ctxTabId = id;
    const t = tabs.get(id);
    if (t) kit().setState(t.btn, "ctxTarget", true);

    kit().setState(menu, "hidden", false);
    const w = menu.offsetWidth, h = menu.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    let left = x, top = y;
    if (left + w > vw - 8) left = Math.max(8, x - w);
    if (top + h > vh - 8) top = Math.max(8, y - h);
    menu.style.left = left + "px";
    menu.style.top = top + "px";
  }

  function bindContextMenu() {
    bar.addEventListener("contextmenu", (e) => {
      const btn = e.target.closest("[data-tab-id]");
      if (!btn) return;
      e.preventDefault();
      const id = btn.dataset.tabId;
      if (id && tabs.has(id)) showCtx(e.clientX, e.clientY, id);
    });
  }

  const currentId = () => current;

  /** 初始页签：地址栏里有就用它，否则首页 */
  const initialId = () => (hashMode && readHash()) || HOME;

  /**
   * 启动：打开初始页签。宿主先 navtab.init() 再调它。
   * 单独一个方法是为了让「从哪一页开始」这件事有唯一出口 ——
   * 地址栏、首页 id、宿主自己的判断都在这里汇合。
   */
  function start() {
    seeding = true;
    const p = open(initialId());
    seeding = false;
    return p;
  }

  return {
    init, start, open, close, closeOthers, closeAll, refresh, refreshOrOpen, relabel,
    currentId, initialId,
    get HOME() { return HOME; }
  };
})();

/* ======================== shell/tenon.accordion.js ======================== */
/* ===========================================================
   tenon.accordion.js — 侧边菜单（静态 HTML 增强）
   -----------------------------------------------------------
   菜单不是配置数组，而是 index.html 里写好的骨架：

     <nav id="menu">
       <div>                                   ← 分组（部件 menuGroup）
         <button data-group>                   ← 分组标题按钮（契约）
           <i class="…"></i>                   ← 图标归皮肤
           <span>仪表盘</span>                 ← 分组名（部件 menuTitle）
           <i class="…"></i>                   ← 箭头归皮肤
         </button>
         <div>                                 ← 子项容器
           <a href="pages/x.html" data-view="x">…</a>
         </div>
       </div>
     </nav>

   分组的类名、图标类名都归皮肤，本文件只认三样：
     #menu / #menu-extra        骨架 id
     [data-group]               分组标题按钮
     [data-view] [data-title]   菜单项与页签 id、标题
     .mt 这类读不到文字的需求走 kit.part("menuTitle")，由皮肤回答。

   职责只有“展示态”：折叠、分组展开、折叠态飞出层、当前项高亮，
   以及从 HTML 里读出 id→标题/分组/地址 的索引（Tenon.menuMap）。
   真正的跳转由 tenon.navtab 的全局链接委托完成。
   =========================================================== */
Tenon.accordion = (function () {
  const { qs, qsa } = Tenon.core;
  const kit = () => Tenon.kit;

  const SIDER_W_COLLAPSED = 64;

  let nav = null;
  let flyout = null;
  let appEl = null;
  let hideTimer = 0;

  /* .app 是皮肤根节点，用部件名问套件要，不自己写类名 */
  const app = () => appEl || (appEl = qs(kit().part("app")));
  const isCollapsed = () => !!app() && kit().hasState(app(), "siderCollapsed");
  const isOpen = (node) => !!node && !kit().hasState(node, "hidden");

  /* ---------------- 索引：HTML 即配置 ---------------- */

  function buildIndex() {
    Tenon.menuMap = {};
    // 侧边栏 + 隐藏入口（如个人中心）都进索引，但隐藏入口不参与高亮
    const scope = [qs("#menu"), qs("#menu-extra")].filter(Boolean);
    scope.forEach((root) => {
      qsa("[data-view]", root).forEach((a) => {
        const groupEl = a.closest(kit().part("menuGroup"));
        const titleEl = groupEl && groupEl.querySelector(kit().part("menuTitle"));
        Tenon.menuMap[a.dataset.view] = {
          title: (a.dataset.title || a.textContent).trim(),
          group: a.dataset.group || (titleEl ? titleEl.textContent.trim() : ""),
          url: a.getAttribute("href") || "pages/" + a.dataset.view + ".html"
        };
      });
    });
  }

  /* ---------------- 高亮 ---------------- */

  /** 分组里是否有当前项 —— 用状态判断，不拼选择器，换皮肤也成立 */
  function containsActive(group) {
    return qsa("[data-view]", group).some((a) => kit().hasState(a, "active"));
  }

  function highlight(id) {
    if (!nav) return;
    qsa("[data-view]", nav).forEach((a) => kit().setState(a, "active", a.dataset.view === id));
    qsa(kit().part("menuGroup"), nav).forEach((group) => {
      const has = containsActive(group);
      kit().setState(group, "hasActive", has);
      if (has) kit().setState(group, "collapsed", false);
    });
  }

  /* ---------------- 分组展开 / 收起 ---------------- */

  function bindGroups() {
    nav.addEventListener("click", (e) => {
      const parent = e.target.closest("[data-group]");
      if (!parent || isCollapsed()) return;
      // 折叠态下一级菜单只作飞出层锚点，不切换展开态
      const group = parent.parentElement;
      kit().setState(group, "collapsed", !kit().hasState(group, "collapsed"));
    });
  }

  /* ---------------- 页头折叠按钮 ---------------- */

  function bindSiderToggle() {
    const btn = qs("#sider-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const collapsed = !kit().hasState(app(), "siderCollapsed");
      kit().setState(app(), "siderCollapsed", collapsed);
      const icon = btn.querySelector("i");
      if (icon) icon.className = kit().icon(collapsed ? "unfold" : "fold");
      const label = collapsed ? Tenon.i18n.t("accordion.expand") : Tenon.i18n.t("accordion.collapse");
      btn.title = label;
      btn.setAttribute("aria-label", label);
      hideFlyout();
    });
  }

  /* ---------------- 折叠态：一级菜单飞出层 ---------------- */

  function ensureFlyout() {
    if (flyout) return flyout;
    flyout = kit().node("flyout");
    flyout.setAttribute("role", "menu");
    kit().setState(flyout, "hidden", true);
    document.body.appendChild(flyout);

    flyout.addEventListener("mouseenter", () => clearTimeout(hideTimer));
    flyout.addEventListener("mouseleave", hideFlyoutSoon);

    // 飞出层里的链接同样交给 navtab 的全局委托，这里只负责收起
    flyout.addEventListener("click", (e) => {
      if (e.target.closest("[data-view]")) hideFlyout();
    });
    return flyout;
  }

  function hideFlyoutSoon() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideFlyout, 160);
  }

  function toggleFlyoutOn(group, on) {
    kit().setState(group, "flyoutOn", on);
  }

  function hideFlyout() {
    clearTimeout(hideTimer);
    if (!flyout) return;
    kit().setState(flyout, "hidden", true);
    qsa(kit().part("menuGroup"), nav).forEach((g) => toggleFlyoutOn(g, false));
  }

  function showFlyout(group) {
    if (kit().hasState(group, "flyoutOn")) return;
    const panel = ensureFlyout();
    const titleEl = group.querySelector(kit().part("menuTitle"));

    panel.innerHTML = kit().tpl("flyout", {
      title: titleEl ? titleEl.textContent.trim() : "",
      items: qsa("[data-view]", group).map((a) => ({
        url: a.getAttribute("href"),
        id: a.dataset.view,
        text: a.textContent.trim(),
        active: kit().hasState(a, "active")
      }))
    });

    qsa(kit().part("menuGroup"), nav).forEach((g) => toggleFlyoutOn(g, false));
    toggleFlyoutOn(group, true);

    kit().setState(panel, "hidden", false);
    const sider = qs(kit().part("sider"));
    const siderLeft = sider ? sider.getBoundingClientRect().left : 0;
    const anchor = group.querySelector("[data-group]");
    const r = (anchor || group).getBoundingClientRect();
    const h = panel.offsetHeight;
    const vh = document.documentElement.clientHeight;
    const top = Math.max(8, Math.min(r.top - 6, vh - h - 8));
    panel.style.left = siderLeft + SIDER_W_COLLAPSED + 8 + "px";
    panel.style.top = top + "px";
  }

  function bindFlyout() {
    nav.addEventListener("mouseover", (e) => {
      if (!isCollapsed()) return;
      const group = e.target.closest(kit().part("menuGroup"));
      if (group) showFlyout(group);
    });
    nav.addEventListener("mouseleave", () => {
      if (isCollapsed()) hideFlyoutSoon();
    });

    document.addEventListener("mousedown", (e) => {
      if (!isOpen(flyout)) return;
      if (!flyout.contains(e.target)) hideFlyoutSoon();
    });
    document.addEventListener("scroll", hideFlyout, true);
    window.addEventListener("resize", hideFlyout);
  }

  /* ---------------- 初始化 ---------------- */

  function init() {
    nav = qs("#menu");
    if (!nav) return;
    buildIndex();
    bindGroups();
    bindSiderToggle();
    bindFlyout();
    // 初始只展开第一个分组（HTML 里已写好状态时以 HTML 为准）
    const groups = qsa(kit().part("menuGroup"), nav);
    if (groups.length && !groups.some((g) => !kit().hasState(g, "collapsed"))) {
      kit().setState(groups[0], "collapsed", false);
    }
  }

  return { init, highlight, hideFlyout, buildIndex, isCollapsed };
})();
