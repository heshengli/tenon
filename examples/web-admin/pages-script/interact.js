/* ===========================================================
   pages-script/interact.js — 左右两个互动的页面（穿梭框）
   -----------------------------------------------------------
   复选框的勾选态、行内 .checked 由脚本自己维护（不重绘，避免丢焦点）；
   只有“全选 / 移动 / 清空”这类整批动作才重建两列 DOM，
   重建范围限定在 .transfer-bd + 人数 + 已选标签，不动整页。
   =========================================================== */
Tenon.page.define("interact", function (root) {
  const { qs, qsa, esc } = Tenon.core;

  /* 10 名人员，原样搬自 views/demo-pages.js */
  const PEOPLE = [
    { id: 1, name: "张伟", dept: "技术中心" },
    { id: 2, name: "李娜", dept: "市场部" },
    { id: 3, name: "王强", dept: "财务部" },
    { id: 4, name: "刘洋", dept: "技术中心" },
    { id: 5, name: "陈静", dept: "人力资源部" },
    { id: 6, name: "赵磊", dept: "技术中心" },
    { id: 7, name: "孙倩", dept: "市场部" },
    { id: 8, name: "周涛", dept: "财务部" },
    { id: 9, name: "吴敏", dept: "技术中心" },
    { id: 10, name: "郑爽", dept: "市场部" }
  ];

  let chosen = [1, 4];
  const checkedLeft = new Set();
  const checkedRight = new Set();

  /* 重绘范围：两列的 body / 人数标题 / 已选标签 */
  const cols = qsa(".transfer-col", root);
  const leftCol = cols[0] || null;
  const rightCol = cols[1] || null;
  const leftBd = leftCol ? qs(".transfer-bd", leftCol) : null;
  const rightBd = rightCol ? qs(".transfer-bd", rightCol) : null;
  const leftHd = leftCol ? qs(".transfer-hd span", leftCol) : null;
  const rightHd = rightCol ? qs(".transfer-hd span", rightCol) : null;
  const tagBox = qs(".between .flex", root);

  const bagOf = (side) => (side === "left" ? checkedLeft : checkedRight);
  const has = (id) => chosen.includes(id);
  const known = (id) => PEOPLE.some((p) => p.id === id);

  function itemHtml(p, side) {
    const checked = bagOf(side).has(p.id);
    return `<div class="transfer-item ${checked ? "checked" : ""}" data-ti="${side}" data-id="${p.id}">
          <input type="checkbox" ${checked ? "checked" : ""} data-ti-check="${side}:${p.id}">
          <span>${esc(p.name)}</span>
          <span class="ti-meta">${esc(p.dept)}</span>
        </div>`;
  }

  /* 按 PEOPLE 原顺序切分左右两列，然后整块写回 */
  function paint() {
    const left = PEOPLE.filter((p) => !has(p.id));
    const right = PEOPLE.filter((p) => has(p.id));

    if (leftBd) {
      leftBd.innerHTML = left.length
        ? left.map((p) => itemHtml(p, "left")).join("")
        : `<div class="transfer-empty">已全部选出</div>`;
    }
    if (rightBd) {
      rightBd.innerHTML = right.length
        ? right.map((p) => itemHtml(p, "right")).join("")
        : `<div class="transfer-empty">还没有选择任何人员</div>`;
    }

    if (leftHd) leftHd.innerHTML = `<b>待选人员</b> · ${left.length} 人`;
    if (rightHd) rightHd.innerHTML = `<b>已选人员</b> · ${right.length} 人`;

    if (tagBox) {
      tagBox.innerHTML = `<span class="tiny muted">已选：</span>`
        + (right.length
          ? right.map((p) => Tenon.kit.tag(esc(p.name), "blue")).join("")
          : `<span class="tiny muted">—</span>`);
    }
  }

  paint();

  /* 单条勾选：只更新 Set 与行高亮，不重绘 */
  Tenon.core.on(root, "change", "[data-ti-check]", (e, box) => {
    const parts = String(box.dataset.tiCheck).split(":");
    const side = parts[0];
    const pid = Number(parts[1]);
    const bag = bagOf(side);
    if (!bag) return;
    if (box.checked) bag.add(pid);
    else bag.delete(pid);

    const row = box.closest(".transfer-item");
    if (row) row.classList.toggle("checked", box.checked);
  });

  /* 全选 / 取消全选：整批写 Set 后重绘 */
  Tenon.core.on(root, "click", "[data-ti-all]", (e, btn) => {
    const side = btn.dataset.tiAll;
    const bag = bagOf(side);
    const pool = PEOPLE.filter((p) => (side === "left" ? !has(p.id) : has(p.id)));
    const allOn = pool.length > 0 && pool.every((p) => bag.has(p.id));
    pool.forEach((p) => (allOn ? bag.delete(p.id) : bag.add(p.id)));
    paint();
  });

  /* 左 → 右 / 右 → 左：迁移后清空对应 Set */
  Tenon.core.on(root, "click", "[data-ti-move]", (e, btn) => {
    if (btn.dataset.tiMove === "right") {
      if (!checkedLeft.size) return Tenon.ui.toast("请先在左侧勾选人员", "error");
      // 过滤掉不存在的 id，避免脏数据进入 chosen
      [...checkedLeft].filter(known).forEach((pid) => {
        if (!has(pid)) chosen.push(pid);
      });
      checkedLeft.clear();
    } else {
      if (!checkedRight.size) return Tenon.ui.toast("请先在右侧勾选人员", "error");
      chosen = chosen.filter((pid) => !checkedRight.has(pid));
      checkedRight.clear();
    }
    paint();
  });

  Tenon.core.on(root, "click", "[data-ti-clear]", () => {
    chosen = [];
    checkedLeft.clear();
    checkedRight.clear();
    paint();
  });

  Tenon.core.on(root, "click", "[data-ti-save]", () => {
    if (!chosen.length) return Tenon.ui.toast("请先选择人员", "error");
    Tenon.ui.toast(`已保存 ${chosen.length} 名人员`);
  });
});
