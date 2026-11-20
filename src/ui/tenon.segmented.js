/* ===========================================================
   tenon.segmented.js — 分段控制器
   -----------------------------------------------------------
   <div tn-data="segmented">
     <button class="active" data-seg>日</button>
     <button data-seg>周</button>
   </div>
   选中态由 Tenon.kit 决定。
   =========================================================== */
Tenon.component("segmented", {
  selector: '[tn-data~="segmented"]',

  init(box) {
    const off = Tenon.core.on(box, "click", "[data-seg]", (e, btn) => {
      e.preventDefault();
      Tenon.core.qsa("[data-seg]", box).forEach((b) => Tenon.kit.setState(b, "active", b === btn));
      box.dispatchEvent(new CustomEvent("tenon:segment", { bubbles: true, detail: { value: btn.textContent.trim(), index: Tenon.core.qsa("[data-seg]", box).indexOf(btn) } }));
    });
    return { destroy: off };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});
