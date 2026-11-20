/* ===========================================================
   pages-script/text-form.js — 有文本输入的表单
   -----------------------------------------------------------
   表单标记、字数徽标槽位、.err-text 文案位都在 pages/text-form.html 里，
   输入框样式与错误态样式交给 CSS（.is-error / .err-text.show）；
   留给页面自己的只有三件事：字数统计、必填校验、按协议提交。
   =========================================================== */
Tenon.page.define("text-form", function (root) {
  const { qs } = Tenon.core;

  const form = qs("#text-form", root);
  if (!form) return;

  /* 带字数统计的两个文本域；处理备注是只读的，不参与 */
  const COUNTERS = ["desc", "extra"];

  /* 把 <span data-counter-for="desc"> 的文本同步成「当前 / 上限」 */
  function sync(name) {
    const area = qs(`[name="${name}"]`, form);
    const badge = qs(`[data-counter-for="${name}"]`, form);
    if (!area || !badge) return;
    badge.textContent = `${area.value.length} / ${area.maxLength}`;
  }

  COUNTERS.forEach(sync);

  Tenon.core.on(root, "input", ".textarea", (e, area) => {
    if (COUNTERS.includes(area.name)) sync(area.name);
  });

  /* 原生 reset 会先把值还原，等一帧再刷新计数才不会读到旧值 */
  Tenon.core.on(root, "click", "[data-reset-counter]", () => {
    setTimeout(() => COUNTERS.forEach(sync), 0);
  });

  /* 必填校验：错误样式挂在最近的 .field 上 */
  function check(name, msg) {
    const input = qs(`[name="${name}"]`, form);
    if (!input) return true;
    const field = input.closest(".field") || input.parentElement;
    const err = field ? qs(".err-text", field) : null;
    const bad = !input.value.trim();
    input.classList.toggle("is-error", bad);
    if (err) {
      err.textContent = bad ? msg : "";
      err.classList.toggle("show", bad);
    }
    return !bad;
  }

  Tenon.core.on(root, "submit", "#text-form", async (e) => {
    e.preventDefault();
    const ok = [check("title", "请输入标题"), check("desc", "请填写详细描述")].every(Boolean);
    if (!ok) return Tenon.ui.toast("请补全必填项", "error");

    const res = await Tenon.ajax.post("/api/form/submit", Object.fromEntries(new FormData(form)));
    Tenon.ajax.handle(res);
  });
});
