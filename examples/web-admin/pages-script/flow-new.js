/* ===========================================================
   pages-script/flow-new.js — 新建流程向导（三步）
   -----------------------------------------------------------
   首屏 HTML 是第一步，后续步骤由脚本渲染同一个 #wizard 容器。
   校验、提交仍走 Tenon 协议。
   =========================================================== */
Tenon.page.define("flow-new", function (root) {
  const { qs, esc } = Tenon.core;

  const draft = {
    type: "采购申请",
    title: "采购申请：5 台开发笔记本",
    desc: "用于新入职研发同学，配置 i7 / 32G / 1T。",
    manager: "张伟（技术中心）",
    finance: "王强（财务部）"
  };
  let step = 1;

  function stepBar() {
    const steps = ["填写申请", "选择审批人", "提交完成"];
    return `<div class="steps">
      ${steps.map((label, i) => {
        const index = i + 1;
        const state = index < step ? "done" : index === step ? "active" : "";
        return `<div class="step ${state}">
          <span class="step-dot">${index < step ? "✓" : index}</span>
          <span class="step-label">${label}</span>
        </div>${index < 3 ? `<span class="step-line ${index < step ? "done" : ""}"></span>` : ""}`;
      }).join("")}
    </div>`;
  }

  function stepBody() {
    if (step === 1) {
      return `<div style="max-width:560px">
        <label class="field"><span class="field-label">流程类型</span>
          <select class="select" id="f-type">${["采购申请", "差旅报销", "合同用印", "IT 申请"].map((t) => `<option ${t === draft.type ? "selected" : ""}>${t}</option>`).join("")}</select></label>
        <label class="field"><span class="field-label">标题 <span class="req">*</span></span>
          <input class="input" id="f-title" value="${esc(draft.title)}"></label>
        <label class="field"><span class="field-label">申请说明</span>
          <textarea class="textarea" id="f-desc">${esc(draft.desc)}</textarea></label>
      </div>`;
    }
    if (step === 2) {
      return `<div style="max-width:560px">
        <label class="field"><span class="field-label">部门经理</span>
          <select class="select" id="f-manager">${["张伟（技术中心）", "李娜（市场部）"].map((t) => `<option ${t === draft.manager ? "selected" : ""}>${t}</option>`).join("")}</select></label>
        <label class="field"><span class="field-label">财务复核</span>
          <select class="select" id="f-finance">${["王强（财务部）", "陈静（财务部）"].map((t) => `<option ${t === draft.finance ? "selected" : ""}>${t}</option>`).join("")}</select></label>
        <label class="check-line"><input type="checkbox" checked> 抄送部门助理</label>
      </div>`;
    }
    return `<div style="max-width:560px">
      <div class="desc-row"><span class="desc-label">流程类型</span><span>${esc(draft.type)}</span></div>
      <div class="desc-row"><span class="desc-label">标题</span><span>${esc(draft.title)}</span></div>
      <div class="desc-row"><span class="desc-label">审批链</span><span>${esc(draft.manager)} → ${esc(draft.finance)}</span></div>
      <div class="desc-row"><span class="desc-label">状态</span><span>${Tenon.kit.tag("待提交", "blue")}</span></div>
    </div>`;
  }

  function paint() {
    const box = qs("#wizard", root);
    if (!box) return;
    box.innerHTML = `${stepBar()}${stepBody()}
      <div class="form-actions" style="margin-top:24px">
        ${step > 1 ? `<button class="btn btn-default" data-act="wz-prev">上一步</button>` : ""}
        ${step < 3
          ? `<button class="btn btn-primary" data-act="wz-next">下一步</button>`
          : `<button class="btn btn-primary" data-act="wz-submit">提交申请</button>`}
      </div>`;
  }

  Tenon.core.on(root, "click", "[data-act]", async (e, btn) => {
    const act = btn.dataset.act;

    if (act === "wz-next") {
      if (step === 1) {
        draft.type = qs("#f-type", root).value;
        draft.title = qs("#f-title", root).value.trim();
        draft.desc = qs("#f-desc", root).value.trim();
        if (!draft.title) return Tenon.ui.toast("请输入流程标题", "error");
      }
      if (step === 2) {
        draft.manager = qs("#f-manager", root).value;
        draft.finance = qs("#f-finance", root).value;
      }
      step = Math.min(3, step + 1);
      return paint();
    }

    if (act === "wz-prev") {
      step = Math.max(1, step - 1);
      return paint();
    }

    if (act === "wz-submit") {
      const res = await Tenon.ajax.post("/api/flows/create", { title: draft.title, type: draft.type });
      Tenon.ajax.handle(res, { tabId: "flow-new" });
    }
  });
});
