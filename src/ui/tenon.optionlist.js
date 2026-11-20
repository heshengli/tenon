/* ===========================================================
   tenon.optionlist.js — 选中列表（对应 antd 的 Menu 选中态）
   -----------------------------------------------------------
   <div tn-data="optionlist">
     <div class="a-menu-item active" data-option>用户管理</div>
     <div class="a-menu-item" data-option>系统设置</div>
   </div>
   同一容器内单选；派发 tenon:option（detail.value / index / text）
   =========================================================== */
Tenon.component("optionlist", {
  selector: '[tn-data~="optionlist"]',

  init(box) {
    const off = Tenon.core.on(box, "click", "[data-option]", (e, item) => {
      e.preventDefault();
      const all = Tenon.core.qsa("[data-option]", box);
      all.forEach((m) => Tenon.kit.setState(m, "active", m === item));
      box.dispatchEvent(new CustomEvent("tenon:option", {
        bubbles: true,
        detail: { index: all.indexOf(item), text: item.textContent.trim(), node: item }
      }));
    });
    return { destroy: off };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});
