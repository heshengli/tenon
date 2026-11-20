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
