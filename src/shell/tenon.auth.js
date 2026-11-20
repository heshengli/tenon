/* ===========================================================
   tenon.auth.js — 登录态：登录 / 退出 / 访问守卫
   -----------------------------------------------------------
   故意不依赖 Tenon.dom：index.html 要在 <head> 里就调用 guard()，
   此时 DOM 工具还没加载，提前跳转可避免页面闪一下再跳走。
   勾「记住我」写 localStorage（关浏览器仍在），否则写 sessionStorage。
   =========================================================== */
window.Tenon = window.Tenon || {};

Tenon.auth = (function () {
  /* 存储键带应用前缀：同一个域名下挂两个后台时不会互相顶掉登录态。
     宿主用 <html data-app="my-admin"> 指定，默认 tenon。 */
  const APP = document.documentElement.getAttribute("data-app") || "tenon";
  const KEY = APP + ":user";
  const LOGIN_PAGE = "login.html";

  const read = (store) => {
    try { return JSON.parse(store.getItem(KEY) || "null"); } catch (e) { return null; }
  };

  /** 当前登录用户；未登录返回 null */
  function user() {
    return read(localStorage) || read(sessionStorage);
  }

  function clear() {
    try {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
    } catch (e) { /* 隐私模式忽略 */ }
  }

  /** 写入登录态，remember 决定存哪 */
  function login(name, remember) {
    const data = { name: String(name || "admin"), at: Date.now() };
    clear();
    try {
      (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(data));
    } catch (e) { /* 忽略 */ }
    return data;
  }

  /** 退出：清登录态并回登录页（replace 避免回退又进后台） */
  function logout() {
    clear();
    location.replace(LOGIN_PAGE);
  }

  /** 未登录直接跳登录页；登录页自己不要调 */
  function guard() {
    if (!user()) location.replace(LOGIN_PAGE);
    return !!user();
  }

  return { user, login, logout, guard, KEY };
})();
