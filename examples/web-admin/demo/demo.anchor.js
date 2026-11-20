/* ===========================================================
   tenon.anchor.js — 锚点导航 + 滚动高亮（scrollspy）
   -----------------------------------------------------------
   <aside class="api-nav">
     <a href="#btn" data-anchor="btn">按钮</a>
   </aside>
   <div class="api-body">
     <section class="api-sec" id="btn">…</section>
   </div>

   滚动容器是 #workarea，监听全局只绑一次，
   每次滚动只看“当前可见的那个页签”里的锚点。
   =========================================================== */
Tenon.component("anchor", {
  selector: ".api-nav",

  init(nav) {
    const page = nav.closest(".api-page") || nav.parentElement;

    const off = Tenon.core.on(nav, "click", "[data-anchor]", (e, a) => {
      e.preventDefault();
      const target = page.querySelector("#" + CSS.escape(a.dataset.anchor));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      Tenon.core.qsa("[data-anchor]", nav).forEach((x) => x.classList.toggle("active", x === a));
    });

    ensureSpy();
    return { destroy: off };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});

/* ---------------- 全局滚动监听（只绑一次） ---------------- */
function ensureSpy() {
  const scroller = Tenon.core.qs("#workarea");
  if (!scroller || scroller.dataset.tnSpy) return;
  scroller.dataset.tnSpy = "1";

  let raf = 0;
  scroller.addEventListener("scroll", () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const pane = scroller.querySelector(".pane:not(.hidden)");
      if (!pane) return;
      const page = pane.querySelector(".api-page");
      if (!page) return;
      const secs = Tenon.core.qsa(".api-sec", page);
      if (!secs.length) return;

      const line = scroller.getBoundingClientRect().top + 110;
      let cur = secs[0];
      secs.forEach((s) => { if (s.getBoundingClientRect().top <= line) cur = s; });

      Tenon.core.qsa("[data-anchor]", page).forEach((a) =>
        a.classList.toggle("active", a.dataset.anchor === cur.id));
    });
  }, { passive: true });
}
