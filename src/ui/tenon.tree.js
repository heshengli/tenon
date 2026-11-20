/* ===========================================================
   tenon.tree.js — 树形菜单
   -----------------------------------------------------------
   <ul tn-data="tree">
     <li>
       <div class="tree-row active" data-node="1">
         <span class="tree-caret" data-caret="1">▶</span>
         <span class="tree-icon folder">▣</span>
         <span>华信科技集团</span>
       </div>
       <ul class="tree-children hidden">…</ul>
     </li>
   </ul>

   只做“展开 / 选中”两件事，选中后派发 tenon:tree-select，
   详情联动交给页面脚本 —— 控件不认识业务。
   =========================================================== */
Tenon.component("tree", {
  selector: '[tn-data~="tree"]',

  init(tree) {
    const ROW = Tenon.kit.part("treeRow");
    const KIDS = Tenon.kit.part("treeChildren");
    const CARET = Tenon.kit.part("treeCaret");
    const rows = () => Tenon.core.qsa(ROW, tree);

    const off = Tenon.core.on(tree, "click", ROW, (e, row) => {
      const caret = e.target.closest("[data-caret]");

      // 点箭头：只展开 / 收起，不改变选中
      if (caret && caret.dataset.caret === "1") {
        const li = row.parentElement;
        const children = li.querySelector(":scope > " + KIDS);
        if (!children) return;
        /* 当前是隐藏的，点了就要展开 —— 状态判断在前，写入在后 */
        const willOpen = Tenon.kit.hasState(children, "hidden");
        Tenon.kit.setState(children, "hidden", !willOpen);
        Tenon.kit.setState(caret, "open", willOpen);
        return;
      }
      if (caret && caret.dataset.caret === "0") return;

      rows().forEach((r) => Tenon.kit.setState(r, "active", r === row));
      tree.dispatchEvent(new CustomEvent("tenon:tree-select", {
        bubbles: true, detail: { id: row.dataset.node, text: row.textContent.trim(), row }
      }));
    });

    /** 展开到指定节点（按 data-node 逐级打开祖先） */
    function expandTo(id) {
      const target = Tenon.core.qs(`${ROW}[data-node="${id}"]`, tree);
      if (!target) return false;
      let li = target.closest("li");
      while (li) {
        const parentUl = li.parentElement.closest("li");
        if (parentUl) {
          const kids = parentUl.querySelector(":scope > " + KIDS);
          if (kids) Tenon.kit.setState(kids, "hidden", false);
          const car = parentUl.querySelector(":scope > " + ROW + " > " + CARET);
          if (car) Tenon.kit.setState(car, "open", true);
        }
        li = parentUl;
      }
      return true;
    }

    function select(id, silent) {
      const row = Tenon.core.qs(`${ROW}[data-node="${id}"]`, tree);
      if (!row) return;
      expandTo(id);
      rows().forEach((r) => Tenon.kit.setState(r, "active", r === row));
      if (!silent) {
        tree.dispatchEvent(new CustomEvent("tenon:tree-select", {
          bubbles: true, detail: { id: row.dataset.node, text: row.textContent.trim(), row }
        }));
      }
    }

    return { expandTo, select, destroy: off };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});
