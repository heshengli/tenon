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
