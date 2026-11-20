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
