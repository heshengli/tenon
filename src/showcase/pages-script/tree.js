/* ===========================================================
   pages-script/tree.js — tree 页的业务
   -----------------------------------------------------------
   树控件不认识业务，选完派发 tenon:tree-select，这里把详情写出来。
   =========================================================== */
Tenon.page.define("tree", function (root) {
  const { qs } = Tenon.core;

  const tree = qs('[tn-data~="tree"]', root);
  const out = qs("#tree-detail", root);

  if (tree && out) {
    tree.addEventListener("tenon:tree-select", (e) => {
      out.textContent = "选中：" + e.detail.text + "（data-node=" + e.detail.id + "）";
    });
  }

  root.addEventListener("tenon:collapse", (e) => {
    Tenon.ui.toast(e.detail.open ? "展开了一节" : "收起了一节", "info");
  });
});
