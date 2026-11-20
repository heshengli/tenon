/* ===========================================================
   tenon.rate.js — 评分
   -----------------------------------------------------------
   <div tn-data="rate">
     <i class="fa-solid fa-star on"></i> × 5
   </div>
   点击第 n 颗 → 前 n 颗点亮；派发 tenon:rate（detail.value = n）
   点亮态由 Tenon.kit 决定，控件不写类名。
   =========================================================== */
Tenon.component("rate", {
  selector: '[tn-data~="rate"]',

  init(box) {
    const stars = () => Tenon.core.qsa(Tenon.kit.part("rateStar"), box);

    function paint(n) {
      stars().forEach((s, i) => Tenon.kit.setState(s, "on", i < n));
      box.dataset.value = String(n);
    }

    paint(stars().filter((s) => Tenon.kit.hasState(s, "on")).length);

    const off = Tenon.core.on(box, "click", "i", (e, star) => {
      const n = stars().indexOf(star) + 1;
      paint(n);
      box.dispatchEvent(new CustomEvent("tenon:rate", { bubbles: true, detail: { value: n } }));
    });

    return { set: paint, value: () => Number(box.dataset.value || 0), destroy: off };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});
