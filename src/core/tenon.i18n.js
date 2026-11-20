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
