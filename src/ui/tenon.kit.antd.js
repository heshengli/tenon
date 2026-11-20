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
