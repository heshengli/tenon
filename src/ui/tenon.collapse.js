/* ===========================================================
   tenon.collapse.js — 折叠面板
   -----------------------------------------------------------
   <div class="a-collapse" tn-data="collapse">
     <div class="a-collapse-item open">
       <button class="a-collapse-hd" data-collapse><span>标题</span><span class="caret">▶</span></button>
       <div class="a-collapse-bd">…</div>
     </div>
   </div>

   容器加 tn-data-accordion 则同时只展开一个（手风琴模式）。
   =========================================================== */
Tenon.component("collapse", {
  selector: '[tn-data~="collapse"]',

  init(box) {
    const single = box.hasAttribute("tn-data-accordion");
    const ITEM = Tenon.kit.part("collapseItem");

    const off = Tenon.core.on(box, "click", "[data-collapse]", (e, hd) => {
      e.preventDefault();
      const item = hd.closest(ITEM);
      if (!item) return;
      const willOpen = !Tenon.kit.hasState(item, "open");
      if (single && willOpen) {
        Tenon.core.qsa(ITEM, box).forEach((it) => Tenon.kit.setState(it, "open", false));
      }
      Tenon.kit.setState(item, "open", willOpen);
      box.dispatchEvent(new CustomEvent("tenon:collapse", { bubbles: true, detail: { item, open: willOpen } }));
    });

    return { destroy: off };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});
