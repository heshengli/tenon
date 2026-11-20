/* ===========================================================
   tenon.tabs.js — 选项卡
   -----------------------------------------------------------
   声明方式（状态全在 HTML 里，JS 不改初始态）：

     <div tn-data="tabs">
       <button class="tab-item active" data-tab="info">基本信息</button>
       <button class="tab-item" data-tab="param">参数配置</button>
     </div>
     <div data-pane="info">…</div>
     <div data-pane="param" class="hidden">…</div>

   容器只需声明 tn-data="tabs"，类名与本层无关。
   面板可在容器外部（选项卡条与面板常是兄弟节点）。
   =========================================================== */
Tenon.component("tabs", {
  selector: '[tn-data~="tabs"]',

  init(box) {
    const { qsa } = Tenon.core;
    /* 面板可能不在容器内部（选项卡条与面板常是兄弟节点），
       所以按钮看 box，面板看更外一层作用域 */
    const scope = box.closest(Tenon.kit.part("tabsScope")) || box.parentElement || box;
    const buttons = () => qsa("[data-tab]", box);
    const panes = () => qsa("[data-pane]", scope);

    /* 语义交给 ARIA，外观交给 kit：这两件事互不干扰。
       初始态只补语义、不动可见性 —— 可见性是 HTML 说了算。 */
    box.setAttribute("role", "tablist");
    panes().forEach((p) => p.setAttribute("role", "tabpanel"));
    (function initAria() {
      const list = buttons();
      const on = list.find((b) => Tenon.kit.hasState(b, "active"));
      list.forEach((b) => {
        const active = on ? b === on : b === list[0];
        b.setAttribute("role", "tab");
        b.setAttribute("aria-selected", b === on ? "true" : "false");
        b.setAttribute("tabindex", active ? "0" : "-1");
      });
    })();

    function select(key) {
      buttons().forEach((b) => {
        const on = b.dataset.tab === key;
        Tenon.kit.setState(b, "active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.setAttribute("tabindex", on ? "0" : "-1");     // 整条栏只有一个 Tab 落点
      });
      panes().forEach((p) => Tenon.kit.setState(p, "hidden", p.dataset.pane !== key));
      box.dispatchEvent(new CustomEvent("tenon:tab", { bubbles: true, detail: { key } }));
    }

    const off = Tenon.core.on(box, "click", "[data-tab]", (e, btn) => {
      e.preventDefault();
      select(btn.dataset.tab);
    });

    /* 方向键在选项卡之间移动（WAI-ARIA 的 tablist 惯例，随焦点自动激活） */
    const offKey = Tenon.core.on(box, "keydown", "[data-tab]", (e, btn) => {
      const list = buttons();
      const i = list.indexOf(btn);
      let to = -1;
      if (e.key === "ArrowRight") to = (i + 1) % list.length;
      else if (e.key === "ArrowLeft") to = (i - 1 + list.length) % list.length;
      else if (e.key === "Home") to = 0;
      else if (e.key === "End") to = list.length - 1;
      if (to < 0) return;
      e.preventDefault();
      select(list[to].dataset.tab);
      list[to].focus();
    });

    return {
      select,
      current: () => {
        const on = buttons().find((b) => Tenon.kit.hasState(b, "active"));
        return on ? on.dataset.tab : null;
      },
      destroy() { off(); offKey(); }
    };
  },

  destroy(node, inst) {
    if (inst && inst.destroy) inst.destroy();
  }
});
