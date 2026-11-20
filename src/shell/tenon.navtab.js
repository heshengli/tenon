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

