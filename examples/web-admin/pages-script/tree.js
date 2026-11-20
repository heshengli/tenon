/* ===========================================================
   pages-script/tree.js — 组织架构树 + 节点详情联动
   -----------------------------------------------------------
   展开 / 选中由 tenon.tree 负责，它只派发 tenon:tree-select；
   这里负责把选中的节点 id 映射成右侧详情。
   =========================================================== */
Tenon.page.define("tree", function (root) {
  const { qs, esc } = Tenon.core;

  function findNode(id, nodes, path) {
    for (const node of nodes) {
      const next = path ? path + " / " + node.name : node.name;
      if (String(node.id) === String(id)) return { node, path: next };
      if (node.children) {
        const hit = findNode(id, node.children, next);
        if (hit) return hit;
      }
    }
    return null;
  }

  function detailHTML(id) {
    const found = findNode(id, MOCK_DB.tree, "");
    if (!found) return `<span class="muted">请选择左侧节点</span>`;
    const { node, path } = found;
    return `<div>
      <div class="desc-row"><span class="desc-label">节点名称</span><span>${esc(node.name)}</span></div>
      <div class="desc-row"><span class="desc-label">节点编号</span><span>${node.id}</span></div>
      <div class="desc-row"><span class="desc-label">节点类型</span><span>${node.children ? "部门 / 文件夹" : "人员 / 叶子"}</span></div>
      <div class="desc-row"><span class="desc-label">子节点数</span><span>${node.children ? node.children.length : 0}</span></div>
      <div class="desc-row"><span class="desc-label">完整路径</span><span>${esc(path)}</span></div>
      <div class="alert alert-info mt16">
        <span class="alert-icon">i</span>
        <div><div class="alert-title">联动说明</div>
        <div class="alert-desc">点击节点名称查看详情，点击箭头展开 / 收起子节点。该模式对应 jui 的树形菜单与主从结构。</div></div>
      </div>
    </div>`;
  }

  root.addEventListener("tenon:tree-select", (e) => {
    const box = qs("#tree-detail", root);
    if (box) box.innerHTML = detailHTML(e.detail.id);
  });
});
