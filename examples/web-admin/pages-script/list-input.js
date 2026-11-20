/* ===========================================================
   pages-script/list-input.js — 列表输入（行内编辑 + 金额自动计算）
   -----------------------------------------------------------
   输入框、表格骨架、合计行都在 pages/list-input.html 里；
   脚本负责 rows 状态、三个聚合值（行金额 / 数量合计 / 总额），
   增删行时只重写 <tbody>，输入时一个节点都不重建（避免丢光标）。
   =========================================================== */
Tenon.page.define("list-input", function (root) {
  const { qs, esc } = Tenon.core;

  /* 初值原样搬自 views/demo-pages.js */
  const FIRST = [
    { name: '开发笔记本 14"', spec: "i7 / 32G / 1T", qty: 5, price: 8999 },
    { name: '外接显示器 27"', spec: "2K / IPS", qty: 5, price: 1599 },
    { name: "机械键盘", spec: "87 键 / 静音红轴", qty: 8, price: 399 }
  ];

  let rows = FIRST.map((r) => ({ ...r }));
  /* 首帧快照，供「还原」使用（与 rows 互不影响） */
  const snapshot = FIRST.map((r) => ({ ...r }));

  const tbody = qs("table.table-edit tbody", root) || qs("tbody", root);

  const amountOf = (r) => (Number(r.qty) || 0) * (Number(r.price) || 0);
  const totalOf = () => rows.reduce((s, r) => s + amountOf(r), 0);
  const qtyOf = () => rows.reduce((s, r) => s + (Number(r.qty) || 0), 0);

  /* 行模板：行号、data-idx、data-li-amount、data-li-del 全部跟随当前下标 */
  function rowHtml(r, i) {
    return `<tr data-li-row="${i}">
                    <td class="muted">${i + 1}</td>
                    <td><input class="input" data-li="name" data-idx="${i}" value="${esc(r.name)}" placeholder="物品名称"></td>
                    <td><input class="input" data-li="spec" data-idx="${i}" value="${esc(r.spec)}" placeholder="规格"></td>
                    <td><input class="input num" type="number" min="0" data-li="qty" data-idx="${i}" value="${esc(r.qty)}"></td>
                    <td><input class="input num" type="number" min="0" data-li="price" data-idx="${i}" value="${esc(r.price)}"></td>
                    <td class="right" data-li-amount="${i}">¥ ${amountOf(r).toLocaleString()}</td>
                    <td><button class="del-btn" data-li-del="${i}">删除</button></td>
                  </tr>`;
  }

  /* 聚合单元：数量合计 + 金额合计 */
  function paintTotals() {
    const qtyCell = qs("[data-li-qty]", root);
    const totalCell = qs("[data-li-total]", root);
    if (qtyCell) qtyCell.textContent = qtyOf();
    if (totalCell) totalCell.textContent = "¥ " + totalOf().toLocaleString();
  }

  /* 重绘范围只有表格体（行号、行金额、删除按钮下标全在里面） */
  function paintBody() {
    if (tbody) tbody.innerHTML = rows.map((r, i) => rowHtml(r, i)).join("");
    paintTotals();
  }

  paintBody();

  /* 输入：写回状态 + 就地更新该行金额与两个合计，不重绘 */
  Tenon.core.on(root, "input", "[data-li]", (e, input) => {
    const idx = Number(input.dataset.idx);
    const field = input.dataset.li;
    if (!rows[idx] || !field) return;
    rows[idx][field] = input.value;

    const amountCell = qs(`[data-li-amount="${idx}"]`, root);
    if (amountCell) amountCell.textContent = "¥ " + amountOf(rows[idx]).toLocaleString();
    paintTotals();
  });

  Tenon.core.on(root, "click", "[data-li-del]", (e, btn) => {
    if (rows.length === 1) return Tenon.ui.toast("至少保留一行", "error");
    rows.splice(Number(btn.dataset.liDel), 1);
    paintBody();
  });

  Tenon.core.on(root, "click", "[data-li-add]", () => {
    rows.push({ name: "", spec: "", qty: 1, price: 0 });
    paintBody();
  });

  Tenon.core.on(root, "click", "[data-li-reset]", () => {
    rows = snapshot.map((r) => ({ ...r }));
    paintBody();
  });

  Tenon.core.on(root, "click", "[data-li-save]", async () => {
    const bad = rows.findIndex((r) => !String(r.name).trim());
    if (bad >= 0) return Tenon.ui.toast(`第 ${bad + 1} 行填写物品名称`, "error");

    const res = await Tenon.ajax.post("/api/orders/save", { rows: rows.length, total: totalOf() });
    Tenon.ajax.handle(res);
  });
});
