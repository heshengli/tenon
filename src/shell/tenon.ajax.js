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

