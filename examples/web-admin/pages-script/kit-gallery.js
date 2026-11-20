/* ===========================================================
   pages-script/kit-gallery.js — 框架能力演示页的业务
   -----------------------------------------------------------
   控件由 tn-data 自动初始化，这里只做两件页面自己的事：
     1. 给虚拟滚动表格灌 1000 行（init 之后用 setData，不用写 1000 行 HTML）
     2. 把「DOM 里实际渲染了几行」显示出来 —— 这页本身就是证据
   =========================================================== */
Tenon.page.define("kit-gallery", function (root) {
  const { qs } = Tenon.core;

  /* ---------------- 虚拟滚动：1000 行 ---------------- */

  const vtable = qs("table[data-demo-virtual]", root) || qs("table[data-virtual]", root);
  if (vtable) {
    const inst = Tenon.get(vtable, "table");
    const STATUS = ["待处理", "进行中", "已完成"];
    const rows = [];
    for (let i = 1; i <= 1000; i++) {
      const day = String((i % 28) + 1).padStart(2, "0");
      rows.push(
        '<tr data-row-id="' + i + '">' +
        "<td>" + i + "</td>" +
        "<td>任务 #" + i + "</td>" +
        "<td>" + STATUS[i % 3] + "</td>" +
        "<td>2026-11-" + day + "</td>" +
        "</tr>"
      );
    }
    if (inst) inst.setData(rows);

    const note = qs("[data-virtual-note]", root);
    const paint = () => {
      if (!note) return;
      const dom = vtable.querySelectorAll("tbody tr:not([tn-data-spacer])").length;
      const total = vtable.querySelectorAll("tbody tr").length;
      note.textContent = "共 1000 行，DOM 里当前只有 " + dom + " 行（含占位行共 " + total + " 个 tr）";
    };
    vtable.addEventListener("tenon:table-change", paint);
    paint();
  }

  /* ---------------- 两个新控件的反馈 ---------------- */

  root.addEventListener("tenon:select", (e) => {
    const v = e.detail.values || [];
    Tenon.ui.toast(v.length ? "已选 " + v.length + " 项：" + v.join("、") : "已清空", "info");
  });

  root.addEventListener("tenon:upload", (e) => {
    const n = e.detail.files.length;
    Tenon.ui.toast(n ? "已选 " + n + " 个文件：" + e.detail.files.map((f) => f.name).join("、") : "已清空附件", "info");
  });

  root.addEventListener("tenon:cascader", (e) => {
    Tenon.ui.toast("已选地区：" + e.detail.labels.join(" / "));
  });
});
