/* ===========================================================
   pages-script/profile.js — 个人中心
   -----------------------------------------------------------
   页面 HTML 是静态的，登录态相关的几处就地回填；
   退出登录与页头账号菜单共用同一段确认流程。
   =========================================================== */
Tenon.page.define("profile", function (root) {
  const { qs, pad2 } = Tenon.core;

  const fmt = (ts) => {
    const d = new Date(ts || Date.now());
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  function session() {
    const u = (Tenon.auth && Tenon.auth.user()) || null;
    const name = (u && u.name) || "admin";
    let remembered = false;
    try { remembered = !!localStorage.getItem(Tenon.auth.KEY); } catch (e) { /* 忽略 */ }
    return { name, at: (u && u.at) || Date.now(), remembered };
  }

  /* 回填登录态 */
  const s = session();
  const set = (sel, text) => {
    const el = qs(sel, root);
    if (el) el.textContent = text;
  };
  set("#pf-name", s.name);
  set("#pf-avatar", s.name.slice(0, 1).toUpperCase());
  set("#pf-email", s.name + "@example.com");
  set("#pf-login", fmt(s.at));
  set("#pf-state", s.remembered ? "已记住（7 天内免登录）" : "本次会话有效");

  /* 操作 */
  Tenon.core.on(root, "click", "[data-act]", (e, btn) => {
    const act = btn.dataset.act;
    if (act === "logout") {
      Tenon.ui.confirm("退出登录", "确定要退出当前账号吗？退出后需要重新登录。", () => {
        Tenon.auth.logout();
      }, { okText: "退出登录" });
    } else if (act === "theme") {
      const trigger = qs("#theme-trigger");
      if (trigger) trigger.click();
    } else {
      Tenon.ui.toast("演示页面：该操作未接入后端", "info");
    }
  });
});
