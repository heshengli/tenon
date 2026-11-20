/* ===========================================================
   demo/demo.i18n.js — 演示页的语言切换（**宿主侧**，不是框架）
   -----------------------------------------------------------
   框架只翻译它自己的文案（分页、空态、右键菜单、校验提示…）。
   菜单文字、页面正文是宿主的内容，所以这张「页面标题字典」写在这里。

   为什么菜单也要翻：页签标题和面包屑都是从菜单文字读出来的。
   只翻框架文案的话，切到英文会看到「Users」页签配「关闭标签页」菜单 —— 半中半英。

   顺序很重要：语言必须在 accordion.init() 之前定下来，
   否则菜单索引里存的还是旧语言，页签标题就跟着错。
   =========================================================== */
Tenon.lang = (function () {
  const KEY = "web-admin:lang";
  const SUPPORTED = ["zh-CN", "en"];

  /* 30 个页面的英文名。键就是菜单上的 data-view。 */
  const PAGES = {
    "en": {
      dashboard: "Dashboard",
      chart: "Analytics",
      users: "Users",
      query: "Customer Search",
      "my-customers": "My Customers",
      "form-query": "Query Form",
      form: "Data Entry",
      "text-form": "Form with Text",
      "form-tips": "Form with Hints",
      "tab-chart": "Tabs & Charts",
      "tab-chart-switch": "Switch Charts",
      interact: "Two-Way Transfer",
      "list-input": "List Editor",
      "two-level-list": "Two-Level List",
      tabs: "Tab Panels",
      dialog: "Dialogs",
      alert: "Alerts",
      tree: "Tree Menu",
      "antd-general": "General",
      "antd-layout": "Layout",
      "antd-nav": "Navigation",
      "antd-entry": "Data Entry",
      "antd-display": "Data Display",
      "antd-feedback": "Feedback",
      "antd-other": "Other",
      "kit-gallery": "Framework",
      "flow-todo": "To Do",
      "flow-new": "New Process",
      "flow-mine": "My Processes",
      profile: "Profile"
    }
  };

  /* 侧栏分组标题。面包屑里的分组也从这里来（accordion 读的是菜单文字）。 */
  const GROUPS = {
    "en": {
      "group-0": "Overview",
      "group-1": "Data",
      "group-2": "Pages",
      "group-3": "Widgets",
      "group-4": "Components",
      "group-5": "Workflow"
    }
  };

  /* 记住中文原文，切回来时用它还原 —— 不依赖 PAGES 里也写一份中文 */
  const original = new Map();

  function readStored() {
    try {
      const v = localStorage.getItem(KEY);
      return SUPPORTED.indexOf(v) >= 0 ? v : null;
    } catch (e) {
      return null;
    }
  }

  function paintMenu(locale) {
    const dict = PAGES[locale] || {};
    document.querySelectorAll("[data-view]").forEach((a) => {
      const id = a.dataset.view;
      if (!original.has(id)) original.set(id, a.textContent);
      a.textContent = dict[id] || original.get(id);
    });

    const groups = GROUPS[locale] || {};
    document.querySelectorAll("[data-group-key]").forEach((g) => {
      const key = g.dataset.groupKey;
      /* 先问套件要菜单标题的选择器，取不到再退回 demo 自己的类名 */
      const title = g.querySelector(Tenon.kit.part("menuTitle")) || g.querySelector(".mt");
      if (!title) return;
      if (!original.has(key)) original.set(key, title.textContent);
      title.textContent = groups[key] || original.get(key);
    });
  }

  function paintButton() {
    const tag = document.getElementById("lang-code");
    if (tag) tag.textContent = Tenon.i18n.current === "en" ? "中" : "EN";
    const btn = document.getElementById("lang-trigger");
    if (btn) {
      const next = Tenon.i18n.current === "en" ? "切换到中文" : "Switch to English";
      btn.setAttribute("title", next);
      btn.setAttribute("aria-label", next);
    }
  }

  /** 切语言：框架文案 + 菜单文字 + 已开页签标题，一次到位 */
  function apply(locale) {
    Tenon.i18n.use(locale);
    paintMenu(locale);
    if (Tenon.navtab && Tenon.navtab.relabel) Tenon.navtab.relabel();
    paintButton();
    try { localStorage.setItem(KEY, locale); } catch (e) { /* 隐私模式忽略 */ }
    return locale;
  }

  /** 首次进入：把上次选的语言装回去（必须在 accordion.init 之前调） */
  function restore() {
    const saved = readStored();
    const initial = saved || Tenon.i18n.current;
    Tenon.i18n.use(initial);
    paintMenu(initial);
    paintButton();
    return initial;
  }

  function toggle() {
    return apply(Tenon.i18n.current === "en" ? "zh-CN" : "en");
  }

  function init() {
    const btn = document.getElementById("lang-trigger");
    if (btn) {
      paintButton();
      btn.addEventListener("click", toggle);
    }
    return Tenon.i18n.current;
  }

  return { init, apply, restore, toggle, current: () => Tenon.i18n.current, pages: PAGES };
})();
