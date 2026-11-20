/* ===========================================================
   tenon.form.js — 表单校验与提交（框架响应协议）
   -----------------------------------------------------------
   声明方式：

     <form tn-data-validate data-action="/api/customers/save" data-tab="form">
       <label class="field">
         <span class="field-label">客户名称 <span class="req">*</span></span>
         <input class="input" name="cname" data-rule="required" data-msg="请输入客户名称">
         <span class="err-text"></span>
       </label>
       <button type="submit" class="btn btn-primary">保 存</button>
     </form>

   · data-rule 支持链式：required|phone
   · data-msg 覆盖该字段的错误文案
   · data-action 有值 → 校验通过后 POST，并按 框架响应协议处理
     （statusCode=200 / callbackType=closeCurrent / navTabId）
   · 没有 data-action → 只派发 tenon:form-submit，交给页面脚本
   =========================================================== */
Tenon.form = (function () {
  const { qsa } = Tenon.core;
  const T = (k, v) => Tenon.i18n.t(k, v);

  const CHECK = {
    required: (v) => (v.trim() ? true : T("form.required")),
    phone: (v) => (!v || /^1[3-9]\d{9}$/.test(v) || T("form.phone")),
    tel: (v) => (!v || /^[\d\s\-+()]{6,20}$/.test(v) || T("form.tel")),
    email: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || T("form.email")),
    number: (v) => (!v || !Number.isNaN(Number(v)) || T("form.number")),
    int: (v) => (!v || /^-?\d+$/.test(v) || T("form.int")),
    money: (v) => (!v || /^\d+(\.\d{1,2})?$/.test(v) || T("form.money")),
    idcard: (v) => (!v || /^\d{17}[\dXx]$/.test(v) || T("form.idcard")),
    minlen: (v, arg) => (!v || v.trim().length >= Number(arg) || T("form.minlen", { n: arg })),
    maxlen: (v, arg) => (!v || v.trim().length <= Number(arg) || T("form.maxlen", { n: arg }))
  };

  /** 校验一个字段，返回 true 或错误文案 */
  function checkField(input) {
    const rules = (input.dataset.rule || "").split("|").filter(Boolean);
    if (!rules.length) return true;
    for (const raw of rules) {
      const [name, arg] = raw.split(":");
      const fn = CHECK[name];
      if (!fn) continue;
      const r = fn(input.value, arg);
      if (r !== true) return input.dataset.msg || r;
    }
    return true;
  }

  function paint(input, msg) {
    const field = input.closest(Tenon.kit.part("field")) || input.parentElement;
    const err = field ? field.querySelector(Tenon.kit.part("errorText")) : null;
    const bad = msg !== true;
    Tenon.kit.setState(input, "error", bad);
    if (err) {
      err.textContent = bad ? msg : "";
      Tenon.kit.setState(err, "show", bad);
    }
    return !bad;
  }

  /** 校验整表，返回 { ok, data } */
  function validate(form) {
    const fields = qsa("[data-rule]", form);
    let ok = true;
    let first = null;
    fields.forEach((input) => {
      const r = checkField(input);
      if (!paint(input, r) && !first) first = input;
      if (r !== true) ok = false;
    });
    if (first) first.focus();
    return ok;
  }

  function serialize(form) {
    const data = {};
    new FormData(form).forEach((v, k) => {
      if (k in data) data[k] = [].concat(data[k], v);
      else data[k] = v;
    });
    return data;
  }

  /* ---------------- 组件 ---------------- */

  Tenon.component("form", {
    selector: "form[tn-data-validate]",

    init(form) {
      const off = Tenon.core.on(form, "submit", "form", async (e) => {
        e.preventDefault();
        if (!validate(form)) {
          Tenon.ui.toast(T("form.checkRequired"), "error");
          return;
        }
        const data = serialize(form);
        const action = form.dataset.action;

        form.dispatchEvent(new CustomEvent("tenon:form-submit", { bubbles: true, detail: { data, form } }));

        if (!action) return;
        const btn = form.querySelector("[type='submit']");
        if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = T("form.submitting"); }
        const res = await Tenon.ajax.post(action, data);
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || T("form.submit"); }
        Tenon.ajax.handle(res, { tabId: form.dataset.tab || Tenon.navtab.currentId() });
      });

      // 输入时清掉上一轮的错误提示
      const offInput = Tenon.core.on(form, "input change", "[data-rule]", (e, input) => paint(input, true));

      return {
        validate: () => validate(form),
        serialize: () => serialize(form),
        destroy() { off(); offInput(); }
      };
    },

    destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
  });

  return { validate, serialize, checkField, rules: CHECK };
})();
