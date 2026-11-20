/* ===========================================================
   pages-script/dialog.js — 弹窗 / 提示 演示页
   -----------------------------------------------------------
   弹窗本身是 tenon.ui 的能力（遮罩关闭、宽度、嵌套），
   本页只把按钮映射到对应的调用。
   =========================================================== */
Tenon.page.define("dialog", function (root) {
  Tenon.core.on(root, "click", "[data-modal]", (e, btn) => {
    const kind = btn.dataset.modal;

    if (kind === "basic") {
      Tenon.ui.modal({
        title: "基础弹窗",
        body: "<p>这是一个基础弹窗。</p><p class='muted' style='margin-top:8px'>点击遮罩、右上角 × 或“取消”均可关闭。</p>"
      });
    }

    if (kind === "form") {
      Tenon.ui.modal({
        title: "新增客户",
        width: 620,
        okText: "保 存",
        body: `<div class="form-grid">
          <label class="field"><span class="field-label">客户名称 <span class="req">*</span></span><input class="input" placeholder="公司全称"></label>
          <label class="field"><span class="field-label">联系人 <span class="req">*</span></span><input class="input" placeholder="姓名"></label>
          <label class="field"><span class="field-label">联系电话</span><input class="input" placeholder="手机号"></label>
          <label class="field"><span class="field-label">等级</span><select class="select"><option>VIP</option><option>普通</option><option>潜力</option></select></label>
        </div>`,
        onOk: () => Tenon.ui.toast("客户已保存")
      });
    }

    if (kind === "confirm") {
      Tenon.ui.modal({
        title: "确认操作",
        width: 420,
        body: "确定要提交当前表单吗？提交后将进入审批流程。",
        onOk: () => Tenon.ui.toast("已提交")
      });
    }

    if (kind === "delete") {
      Tenon.ui.confirm("删除确认", "删除后不可恢复，确定删除该条记录吗？", () => Tenon.ui.toast("已删除"));
    }

    if (kind === "nested") {
      Tenon.ui.modal({
        title: "第一层弹窗",
        body: "点击下方按钮可再打开一个弹窗。",
        okText: "再打开一个",
        onOk: () => Tenon.ui.modal({
          title: "第二层弹窗",
          width: 420,
          hideCancel: true,
          body: "弹窗支持嵌套打开，关闭后回到上一层。"
        })
      });
    }
  });

  Tenon.core.on(root, "click", "[data-msg]", (e, btn) => {
    const type = btn.dataset.msg;
    Tenon.ui.toast(type === "success" ? "操作成功，数据已保存" : "请求失败，请稍后重试", type);
  });

  Tenon.core.on(root, "click", "[data-loading]", async (e, btn) => {
    btn.disabled = true;
    btn.textContent = "加载中…";
    await new Promise((r) => setTimeout(r, 1200));
    btn.disabled = false;
    btn.textContent = "加载完成";
    Tenon.ui.toast("加载完成");
  });
});
