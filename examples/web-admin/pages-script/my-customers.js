/* ===========================================================
   pages-script/my-customers.js — 我的客户
   -----------------------------------------------------------
   表格的排序 / 分页 / 全选交给 tenon.table；
   这里做三件业务事：左侧分类筛选、条件查询、增删改。
   分类计数与“共 N 条”都从表格实例的数据算，不另存一份。
   =========================================================== */
Tenon.page.define("my-customers", function (root) {
  const { qs, qsa, esc } = Tenon.core;
  const table = Tenon.get(qs("table[tn-data]", root), "table");
  if (!table) return;

  const kw = qs("#mc-kw", root);
  const status = qs("#mc-status", root);
  const totalEl = qs("#mc-total", root);
  let cat = "all";

  /* ---------------- 分类谓词 ---------------- */
  const CAT = {
    all: () => true,
    vip: (row) => row.cells[3] === "VIP",
    normal: (row) => row.cells[3] === "普通",
    potential: (row) => row.cells[3] === "潜力",
    stop: (row) => row.cells[5] === "停用"
  };

  function counts() {
    qsa("[data-cat]", root).forEach((item) => {
      const fn = CAT[item.dataset.cat] || CAT.all;
      const n = table.data.filter(fn).length;
      const box = item.querySelector(".count");
      if (box) box.textContent = n;
    });
  }

  function apply() {
    const n = (kw.value || "").trim().toLowerCase();
    const st = status.value;
    const catFn = CAT[cat] || CAT.all;
    table.filter((row) => {
      if (!catFn(row)) return false;
      if (st && row.cells[5] !== st) return false;
      if (n && !(row.cells[1] + row.cells[2]).toLowerCase().includes(n)) return false;
      return true;
    });
  }

  /* ---------------- 行模板 ---------------- */
  const LEVEL_TAG = { VIP: "blue", 潜力: "warn", 普通: "default" };

  function rowHtml(u) {
    return `<tr data-row-id="${u.id}">
            <td><input type="checkbox" data-check="${u.id}"></td>
            <td>${esc(u.name)}</td>
            <td>${esc(u.company)}</td>
            <td><span class="tag tag-${LEVEL_TAG[u.level] || "default"}">${esc(u.level)}</span></td>
            <td class="right">¥ ${Number(u.amount || 0).toLocaleString()}</td>
            <td><span class="tag tag-${u.status === "启用" ? "ok" : "default"}">${esc(u.status)}</span></td>
            <td class="muted">${esc(u.date)}</td>
          </tr>`;
  }

  /* ---------------- 弹窗表单 ---------------- */
  function formHtml(c) {
    const levels = ["VIP", "普通", "潜力"]
      .map((v) => `<option ${v === c.level ? "selected" : ""}>${v}</option>`).join("");
    return `<div class="form-grid">
      <label class="field"><span class="field-label">客户名称 <span class="req">*</span></span>
        <input class="input" name="cname" value="${esc(c.name)}" placeholder="联系人姓名"></label>
      <label class="field"><span class="field-label">所属公司</span>
        <input class="input" name="company" value="${esc(c.company)}" placeholder="公司全称"></label>
      <label class="field"><span class="field-label">客户等级</span>
        <select class="select" name="level">${levels}</select></label>
      <label class="field"><span class="field-label">合同额</span>
        <input class="input" name="amount" value="${c.amount || ""}" placeholder="¥"></label>
    </div>`;
  }

  function readForm(body) {
    const get = (n) => {
      const el = body.querySelector(`[name="${n}"]`);
      return el ? el.value.trim() : "";
    };
    return { name: get("cname"), company: get("company") || get("cname"), level: get("level"), amount: Number(get("amount")) || 0 };
  }

  function openEditor(customer) {
    const editing = !!customer;
    const c = customer || { name: "", company: "", level: "普通", amount: "" };
    Tenon.ui.modal({
      title: editing ? "修改客户" : "添加客户",
      width: 560,
      okText: "保 存",
      body: formHtml(c),
      onOk: async (body) => {
        const data = readForm(body);
        if (!data.name) return Tenon.ui.toast("请输入客户名称", "error");

        if (editing) {
          const res = await Tenon.ajax.post("/api/customers/update", { id: c.id, ...data });
          Tenon.ajax.handle(res, { skipRefresh: true, refreshCurrent: false });
          if (String(res.statusCode) !== "200") return;
          table.setData(table.data.map((r) =>
            String(r.id) === String(c.id) ? rowHtml({ ...data, id: c.id, status: c.status, date: c.date }) : r.html));
        } else {
          const res = await Tenon.ajax.post("/api/customers/create", data);
          Tenon.ajax.handle(res, { skipRefresh: true });
          if (String(res.statusCode) !== "200") return;
          const nextId = Math.max(0, ...table.data.map((r) => Number(r.id) || 0)) + 1;
          const today = new Date().toISOString().slice(0, 10);
          table.setData([...table.data.map((r) => r.html),
            rowHtml({ ...data, id: nextId, status: "启用", date: today })]);
        }
        counts();
        apply();
      }
    });
  }

  /* ---------------- 事件 ---------------- */
  Tenon.core.on(root, "click", "[data-cat]", (e, item) => {
    cat = item.dataset.cat;
    qsa("[data-cat]", root).forEach((x) => x.classList.toggle("active", x === item));
    apply();
  });

  Tenon.core.on(root, "click", "[data-mc]", (e, btn) => {
    const act = btn.dataset.mc;

    if (act === "search") return apply();

    if (act === "reset") {
      kw.value = "";
      status.value = "";
      cat = "all";
      qsa("[data-cat]", root).forEach((x) => x.classList.toggle("active", x.dataset.cat === "all"));
      return apply();
    }

    if (act === "add") return openEditor(null);

    if (act === "edit") {
      const ids = table.selected();
      if (ids.length !== 1) return Tenon.ui.toast("请勾选一条记录再修改", "error");
      const row = table.data.find((r) => String(r.id) === String(ids[0]));
      if (!row) return;
      openEditor({
        id: row.id, name: row.cells[1], company: row.cells[2],
        level: row.cells[3], amount: Number(row.cells[4].replace(/[^\d]/g, "")),
        status: row.cells[5], date: row.cells[6]
      });
      return;
    }

    if (act === "del") {
      const ids = table.selected();
      if (!ids.length) return Tenon.ui.toast("请先勾选要删除的客户", "error");
      Tenon.ui.confirm("删除确认", `确定删除选中的 ${ids.length} 个客户吗？删除后不可恢复。`, async () => {
        const res = await Tenon.ajax.post("/api/customers/delete", { ids: ids.join(",") });
        Tenon.ajax.handle(res, { skipRefresh: true });
        if (String(res.statusCode) !== "200") return;
        ids.forEach((id) => table.remove(id));
        counts();
        apply();
      });
    }
  });

  root.addEventListener("tenon:table-change", (e) => {
    if (totalEl) totalEl.textContent = "共 " + e.detail.total + " 条";
  });

  counts();
});
