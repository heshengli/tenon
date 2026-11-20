/* ===========================================================
   demo.boot.js — 本 demo 的外壳装配
   -----------------------------------------------------------
   它原先叫 src/shell/tenon.boot.js，后来搬出来了：
   里面这张 ACTIONS 表（个人中心 / 个人设置 / 退出登录）属于本 demo 的
   账号菜单，不是框架能力。框架里留一份「知道你叫 profile」的代码，
   换个后台就得改框架 —— 这违反分层。

   现在外壳的装配由宿主自己写，框架只提供 disassembled 的零件：

     Tenon.accordion.init();    菜单索引 + 折叠 + 飞出层
     Tenon.navtab.init();       页签条
     Tenon.navtab.start();      打开初始页签（地址栏有值就打开那一页）
     Tenon.ready(boot);         DOM 就绪后执行

   参考 src/showcase/index.html：那边只有三行，没有账号菜单。
   =========================================================== */
(function () {
  const { qs } = Tenon.core;

  /* ---------------- 账号菜单的动作 ---------------- */

  const ACTIONS = {
    profile: () => Tenon.navtab.open("profile"),
    setting: () => {
      const trigger = qs("#theme-trigger");
      if (trigger) trigger.click();
    },
    logout: () => {
      // 与「个人中心」页的退出按钮共用同一段确认流程
      Tenon.ui.confirm("退出登录", "确定要退出当前账号吗？退出后需要重新登录。", () => {
        Tenon.auth.logout();
      }, { okText: "退出登录" });
    }
  };

  function renderUser() {
    const u = (Tenon.auth && Tenon.auth.user()) || null;
    const name = (u && u.name) || "admin";
    const nameEl = qs("#user-name");
    const avEl = qs("#user-avatar");
    if (nameEl) nameEl.textContent = name;
    if (avEl) avEl.textContent = name.slice(0, 1).toUpperCase();
  }

  function bindUserMenu() {
    const trigger = qs("#user-trigger");
    const menu = qs("#user-menu");
    if (!trigger || !menu) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (Tenon.dropdown.isOpen()) Tenon.dropdown.close();
      else Tenon.dropdown.open(trigger, menu);
    });

    menu.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-user]");
      if (!btn) return;
      Tenon.dropdown.close();
      const fn = ACTIONS[btn.dataset.user];
      if (fn) fn();
    });
  }

  /* ---------------- 启动 ---------------- */

  function boot() {
    /* 语言必须在菜单索引之前定下来：页签标题是从菜单文字读的 */
    if (Tenon.lang) {
      Tenon.lang.restore();
      Tenon.lang.init();
    }

    Tenon.accordion.init();
    Tenon.navtab.init();

    renderUser();
    bindUserMenu();

    Tenon.navtab.start();
  }

  Tenon.ready(boot);
})();
