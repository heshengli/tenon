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
