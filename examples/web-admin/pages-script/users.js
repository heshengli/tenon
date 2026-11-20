/* ===========================================================
   pages-script/users.js — 用户管理页业务
   -----------------------------------------------------------
   表格的排序 / 分页 / 全选由 tenon.table 负责，
   这里只做“工具栏动作”：搜索、重置、增删改。
   数据以 HTML 里已经渲染的行为准（等价服务端输出），
   动作成功后直接更新表格实例，不再整页重载。
   =========================================================== */
Tenon.page.define("users", function (root) {
  const { qs, esc } = Tenon.core;
  const table = Tenon.get(qs("table[tn-data]", root), "table");
  if (!table) return;

  /* ---------------- 行模板 ---------------- */
  function rowHtml(u) {
    return `<tr data-row-id="${u.id}">
        <td><input type="checkbox" data-check="${u.id}"></td>
        <td>${u.id}</td>
        <td>${esc(u.name)}</td>
        <td>${esc(u.role)}</td>
        <td>${esc(u.dept)}</td>
        <td>${u.age}</td>
        <td><span class="tag tag-${u.status === "启用" ? "ok" : "default"}">${esc(u.status)}</span></td>
        <td class="cell-right">
          <button class="link" data-act="edit" data-id="${u.id}">编辑</button>
          <button class="link danger" data-act="del" data-id="${u.id}">删除</button>
        </td>
      </tr>`;
  }

  /* ---------------- 编辑 / 新增 ---------------- */
  const ROLES = ["管理员", "编辑", "访客"];
  const DEPTS = ["技术中心", "市场部", "财务部", "人力资源部"];
  const STATUS = ["启用", "停用"];

  function formHtml(u) {
    const opts = (list, cur) =>
      list.map((v) => `<option ${v === cur ? "selected" : ""}>${v}</option>`).join("");
    return `<div>
      <label class="field"><span class="field-label">姓名 <span class="req">*</span></span>
        <input class="input" name="name" value="${esc(u.name)}" placeholder="请输入姓名"></label>
      <label class="field"><span class="field-label">角色</span>
        <select class="select" name="role">${opts(ROLES, u.role)}</select></label>
      <label class="field"><span class="field-label">部门</span>
        <select class="select" name="dept">${opts(DEPTS, u.dept)}</select></label>
      <div class="form-grid">
        <label class="field"><span class="field-label">年龄</span>
          <input class="input" name="age" value="${u.age}"></label>
        <label class="field"><span class="field-label">状态</span>
          <select class="select" name="status">${opts(STATUS, u.status)}</select></label>
      </div>
      <p class="hint" style="margin:0">保存走 Tenon 协议：statusCode=200 → 关闭弹窗 → 刷新用户列表</p>
    </div>`;
  }

  function openEditor(user) {
    const editing = !!user;
    const u = user || { id: "", name: "", role: "编辑", age: "", dept: "技术中心", status: "启用" };

    Tenon.ui.modal({
      title: editing ? "编辑用户" : "新增用户",
      body: formHtml(u),
      okText: "保 存",
      onOk: async (body) => {
        const get = (name) => {
          const input = body.querySelector(`[name="${name}"]`);
          return input ? input.value.trim() : "";
        };
        const data = {
          id: editing ? u.id : "",
          name: get("name"), role: get("role"), dept: get("dept"),
          age: get("age") || 0, status: get("status")
        };
        if (!data.name) return Tenon.ui.toast("请输入姓名", "error");

        const res = await Tenon.ajax.post("/api/users/save", data);
        // 关闭弹窗由协议处理；列表自己更新，所以跳过 navTabId 整页刷新
        Tenon.ajax.handle(res, { skipRefresh: true });
        if (String(res.statusCode) !== "200") return;

        if (editing) {
          table.setData(table.data.map((r) => (String(r.id) === String(u.id) ? rowHtml(data) : r.html)));
        } else {
          const nextId = Math.max(0, ...table.data.map((r) => Number(r.id) || 0)) + 1;
          table.setData([...table.data.map((r) => r.html), rowHtml({ ...data, id: nextId })]);
        }
      }
    });
  }

  /* ---------------- 工具栏 ---------------- */
  Tenon.core.on(root, "input", "#users-q", (e, input) => table.search(input.value));

  Tenon.core.on(root, "click", "[data-act]", async (e, btn) => {
    const act = btn.dataset.act;

    if (act === "reset") {
      qs("#users-q", root).value = "";
      table.reset();
      return;
    }

    if (act === "add") return openEditor(null);

    if (act === "edit") {
      const row = table.data.find((r) => String(r.id) === String(btn.dataset.id));
      if (!row) return;
      openEditor({
        id: row.id,
        name: row.cells[2], role: row.cells[3], dept: row.cells[4],
        age: row.cells[5], status: row.cells[6]
      });
      return;
    }

    if (act === "del") {
      const id = btn.dataset.id;
      Tenon.ui.confirm("删除确认", "删除后不可恢复，确定删除该用户吗？", async () => {
        const res = await Tenon.ajax.post("/api/users/delete", { id });
        Tenon.ajax.handle(res, { skipRefresh: true });
        if (String(res.statusCode) === "200") table.remove(id);
      });
      return;
    }

    if (act === "batch-del") {
      const ids = table.selected();
      if (!ids.length) return Tenon.ui.toast("请先勾选要删除的记录", "error");
      Tenon.ui.confirm("批量删除", `确定删除选中的 ${ids.length} 条记录吗？`, async () => {
        const res = await Tenon.ajax.post("/api/users/batch-delete", { ids });
        Tenon.ajax.handle(res, { skipRefresh: true });
        if (String(res.statusCode) !== "200") return;
        ids.forEach((id) => table.remove(id));
      });
    }
  });
});
