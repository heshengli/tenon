/* ===========================================================
   selftest.js — 框架自检
   -----------------------------------------------------------
   为什么要有这个文件：
   框架的价值在「约定」，约定一旦破了不会报错，只会安静地变样。
   所以每条约定至少落一个断言，改代码前先跑一遍。

   约束：本文件不引 demo 的任何 CSS 与脚本。
   断言只读逻辑状态（kit.hasState / 实例 API），不读计算样式，
   这样「框架行为」与「皮肤长什么样」是两件事。

   跑法：起静态服务后打开 src/selftest.html
   =========================================================== */
(async function () {
  const { qs, qsa, el } = Tenon.core;
  const FX = "#fixtures";
  const results = [];

  /* ---------------- 断言与运行器 ---------------- */

  function assert(cond, msg) {
    if (!cond) throw new Error(msg || "断言失败");
  }

  function eq(actual, expected, msg) {
    if (String(actual) !== String(expected)) {
      throw new Error((msg ? msg + "：" : "") + "期望 " + expected + "，实际 " + actual);
    }
  }

  /* 夹具：只插 DOM，不初始化 */
  function html(markup) {
    const host = el("div");
    host.innerHTML = markup;
    qs(FX).appendChild(host);
    return host;
  }

  /* 夹具：插入并让扫描器初始化 */
  function mount(markup) {
    const host = html(markup);
    Tenon.init(host);
    return host;
  }

  function drop(host) {
    Tenon.destroy(host);
    host.remove();
  }

  /* 每个用例结束都清场：哪怕中途抛错也不给下一个用例留残渣 */
  function clearAll() {
    qsa(FX + " > div").forEach((h) => {
      try { Tenon.destroy(h); } catch (e) { /* 清场失败不该掩盖原错误 */ }
      h.remove();
    });
    qsa(".modal-mask").forEach((m) => m.remove());
    qsa("body > .dropdown").forEach((m) => m.remove());
  }

  async function test(name, fn) {
    try {
      await fn();
      results.push({ ok: true, name });
    } catch (e) {
      results.push({ ok: false, name, err: e.message });
    } finally {
      clearAll();
    }
  }

  const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));

  /* =========================================================
     core
     ========================================================= */

  await test("core.esc 转义五个敏感字符", () => {
    eq(Tenon.core.esc(`<a href="x">&'`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
    eq(Tenon.core.esc(null), "");
  });

  await test("core.qsa 返回真数组，可链 forEach/find", () => {
    const host = html('<i class="z"></i><i class="z"></i>');
    const list = Tenon.core.qsa(".z", host);
    assert(Array.isArray(list), "应是数组");
    eq(list.length, 2);
    assert(typeof list.find === "function", "应支持 find");
  });

  await test("core.pad2 / num 兜底", () => {
    eq(Tenon.core.pad2(3), "03");
    eq(Tenon.core.pad2(11), "11");
    eq(Tenon.core.num("x", 7), 7);
    eq(Tenon.core.num("8"), 8);
  });

  /* =========================================================
     registry
     ========================================================= */

  await test("registry：注册 → init 幂等 → get 取实例", () => {
    let inits = 0;
    Tenon.component("__probe", {
      selector: '[tn-data~="__probe"]',
      init() { inits++; return { tag: "inst" }; }
    });

    const host = html('<div tn-data="__probe"></div>');
    Tenon.init(host);
    Tenon.init(host);                       // 第二次必须是空转

    eq(inits, 1, "重复 init 不该重复执行");
    const node = host.firstElementChild;
    eq(node.getAttribute("tn-data-done"), "__probe", "应打上完成标记");
    eq(Tenon.get(node, "__probe").tag, "inst", "get 应取回实例");
  });

  await test("registry：destroy 调组件钩子并清干净", () => {
    let killed = 0;
    Tenon.component("__probe2", {
      selector: '[tn-data~="__probe2"]',
      init() { return { say: "hi" }; },
      destroy(node, inst) { killed++; assert(inst.say === "hi", "destroy 应拿到实例"); }
    });

    const host = mount('<div tn-data="__probe2"></div>');
    const node = host.firstElementChild;
    assert(node.__tn && node.__tn.__probe2, "实例应挂在 __tn 上");

    Tenon.destroy(host);
    eq(killed, 1);
    assert(!node.hasAttribute("tn-data-done"), "标记应被摘掉");
    assert(!node.__tn, "实例表应被删除");
  });

  await test("registry：init 的第二个参数可限定只扫某个控件", () => {
    let a = 0, b = 0;
    Tenon.component("__pa", { selector: '[tn-data~="__pa"]', init() { a++; } });
    Tenon.component("__pb", { selector: '[tn-data~="__pb"]', init() { b++; } });

    const host = html('<div tn-data="__pa"></div><div tn-data="__pb"></div>');
    Tenon.init(host, ["__pa"]);
    eq(a, 1);
    eq(b, 0, "未被限定的控件不该初始化");
    Tenon.init(host, ["__pb"]);
    eq(b, 1);
  });

  /* =========================================================
     kit
     ========================================================= */

  await test("kit.setState / hasState 往返，error 映射为 is-error", () => {
    const d = document.createElement("div");

    Tenon.kit.setState(d, "open", true);
    assert(d.classList.contains("open"), "open 应为 true");
    assert(Tenon.kit.hasState(d, "open"));
    assert(!Tenon.kit.hasState(d, "hidden"));

    Tenon.kit.setState(d, "open", false);
    assert(!Tenon.kit.hasState(d, "open"), "应能关掉");

    Tenon.kit.setState(d, "error", true);
    assert(d.classList.contains("is-error"), "error 应翻译成 is-error");
    assert(!d.classList.contains("error"), "不该直接写 error");
  });

  await test("kit.part 返回皮肤选择器，未登记的回落 tn-data-part", () => {
    eq(Tenon.kit.part("sortArrow"), ".th-arrow");
    eq(Tenon.kit.part("treeRow"), ".tree-row");
    eq(Tenon.kit.part("never-defined"), '[tn-data-part="never-defined"]');
  });

  await test("kit.use / current：切到兜底实现后状态变属性，可还原", () => {
    const saved = Tenon.kit.current;
    eq(Tenon.kit.name, "antd");

    Tenon.kit.use({ name: "probe" });        // 只换名字，其余回落 plain
    const d = document.createElement("div");
    Tenon.kit.setState(d, "open", true);
    assert(d.hasAttribute("tn-data-state-open"), "兜底实现应写属性");
    assert(!d.classList.contains("open"), "兜底实现不该写类名");
    eq(Tenon.kit.part("sortArrow"), '[tn-data-part="sort-arrow"]', "兜底实现的部件走属性，名字转 kebab");
    eq(Tenon.kit.part("treeChildren"), '[tn-data-part="tree-children"]');

    Tenon.kit.use(saved);
    eq(Tenon.kit.name, "antd", "应能还原");
    const d2 = document.createElement("div");
    Tenon.kit.setState(d2, "open", true);
    assert(d2.classList.contains("open"), "还原后应重新写类名");
  });

  await test("kit 片段：pager / count / tag / emptyRow / confirm", () => {
    const p = Tenon.kit.pager(2, 3, 23);
    assert(p.includes("共 23 条"), "分页应带总数");
    assert(p.includes('data-page="2"'), "应有页码按钮");
    assert(p.includes("pager-btn active"), "当前页应有 active");

    eq(Tenon.kit.count(7), '<span class="pager-info">共 7 条</span>');
    eq(Tenon.kit.tag("热", "red"), '<span class="tag tag-red">热</span>');
    assert(Tenon.kit.emptyRow(3).includes('colspan="3"'), "空行应跨列");
    assert(Tenon.kit.confirm("x").includes("confirm"), "confirm 片段应带标记");
  });

  /* 九个外壳模板各来一份样例参数 —— 皮肤换掉也得都造得出来 */
  const TPL_CASES = {
    tab: { id: "users", title: "用户管理", fixed: false },
    crumb: { group: "数据管理", title: "用户管理" },
    empty: { text: "没有内容" },
    divider: {},
    pickItem: { id: "users", title: "用户管理", active: true, closable: true },
    pickAction: { act: "all", text: "关闭全部标签页", disabled: true },
    ctxItem: { act: "close", text: "关闭标签页", key: "W", disabled: false },
    flyout: { title: "数据管理", items: [{ url: "pages/users.html", id: "users", text: "用户管理", active: true }] },
    themeDrawer: { presets: [["拂晓蓝", "#1677ff"]], current: "#1677ff" }
  };

  await test("kit 骨架：antd 皮肤下 node / tpl / icon / part 都对得上", () => {
    const node = Tenon.kit.node("moreMenu");
    eq(node.tagName, "DIV");
    assert(node.classList.contains("dropdown") && node.classList.contains("tab-more-menu"),
      "moreMenu 应同时带 dropdown 与 tab-more-menu");

    const tab = Tenon.kit.tpl("tab", TPL_CASES.tab);
    assert(tab.includes('class="tab-close"') && tab.includes('data-tab-close="users"'),
      "普通页签应带关闭按钮与契约属性");
    assert(!Tenon.kit.tpl("tab", { id: "dashboard", title: "工作台", fixed: true }).includes("tab-close"),
      "固定页签不该有关闭按钮");

    const crumb = Tenon.kit.tpl("crumb", TPL_CASES.crumb);
    assert(crumb.includes("crumb-cur"), "面包屑应有当前项");
    assert(!crumb.includes("data-goto"), "面包屑已无首页跳转入口");
    assert(crumb.includes("数据管理"), "面包屑应含分组名");

    eq(Tenon.kit.part("menuGroup"), ".menu-group", "外壳读宿主 DOM 的部件应有映射");
    eq(Tenon.kit.part("app"), ".app");
    eq(Tenon.kit.icon("fold"), "fa-solid fa-outdent");

    Object.keys(TPL_CASES).forEach((n) => {
      assert(Tenon.kit.tpl(n, TPL_CASES[n]).length > 0, n + " 模板不该为空");
    });
  });

  await test("i18n：t() 的查找顺序与占位替换", () => {
    eq(Tenon.i18n.current, "zh-CN", "默认中文");
    eq(Tenon.i18n.t("pager.total", { n: 12 }), "共 12 条", "占位应被替换");
    eq(Tenon.i18n.t("pager.prev"), "上一页");

    Tenon.i18n.define("xx-XX", { "pager.prev": "PREV" });
    Tenon.i18n.use("xx-XX");
    eq(Tenon.i18n.t("pager.prev"), "PREV", "自定义语言优先");
    eq(Tenon.i18n.current, "xx-XX", "认得的语言码原样保留");
    eq(Tenon.i18n.t("pager.next"), "下一页", "缺词条回落到基准语言");
    eq(Tenon.i18n.t("no.such.key"), "no.such.key", "再缺就返回 key，别静默空掉");

    Tenon.i18n.use("en-US");
    eq(Tenon.i18n.current, "en", "en-US 应落到 en（前缀解析）");
    eq(Tenon.i18n.resolve("zh-Hans"), "zh-CN", "zh-Hans 应落到 zh-CN");
    eq(Tenon.i18n.resolve("fr"), "zh-CN", "认不得的退回基准语言");

    Tenon.i18n.use("zh-CN");
    eq(Tenon.i18n.current, "zh-CN", "能切回来");
  });

  await test("i18n：框架文案跟着语言走，tn-data-i18n 标记会被翻译", () => {
    try {
      Tenon.i18n.use("en");

      const host = mount(`<div>
        <table tn-data="table" data-page-size="1">
          <thead><tr><th>N</th></tr></thead>
          <tbody><tr data-row-id="1"><td>1</td></tr><tr data-row-id="2"><td>2</td></tr></tbody>
        </table>
        <div data-pager></div>
        <button id="i18n-btn" tn-data-i18n="ui.ok"></button>
        <input id="i18n-input" tn-data-i18n-ph="select.search">
        <span id="i18n-span" tn-data-i18n-title="navtab.more"></span>
      </div>`);

      const pager = host.querySelector("[data-pager]");
      assert(pager.textContent.includes("in total"),
        "分页器应变成英文，实际：" + pager.textContent.trim());
      assert(pager.textContent.includes("Prev"), "「上一页」应变 Prev");

      Tenon.i18n.apply(host);
      eq(host.querySelector("#i18n-btn").textContent, "OK", "文本标记");
      eq(host.querySelector("#i18n-input").getAttribute("placeholder"), "Search", "placeholder 标记");
      eq(host.querySelector("#i18n-span").getAttribute("title"), "All tabs", "title 标记");
    } finally {
      /* 断言失败也要切回中文，否则后面的用例全被带偏 */
      Tenon.i18n.use("zh-CN");
    }
  });

  await test("i18n：已挂载的控件会自己跟着切语言", () => {
    try {
      const host = mount(`<div>
        <table tn-data="table" data-page-size="1">
          <thead><tr><th>N</th></tr></thead>
          <tbody><tr data-row-id="1"><td>1</td></tr><tr data-row-id="2"><td>2</td></tr></tbody>
        </table>
        <div data-pager></div>
        <select tn-data="select"><option value="">-</option><option value="a">A</option></select>
      </div>`);

      const pager = host.querySelector("[data-pager]");
      const trigger = host.querySelector(Tenon.kit.part("selectTrigger"));
      assert(pager.textContent.includes("共"), "初始应为中文：" + pager.textContent.trim());
      eq(trigger.textContent.trim(), "请选择", "占位是中文");

      Tenon.i18n.use("en");          // 关键：不重新 mount
      assert(pager.textContent.includes("in total"),
        "切语言后分页器应自己变英文，实际：" + pager.textContent.trim());
      eq(trigger.textContent.trim(), "Select", "占位也跟着变");
    } finally {
      Tenon.i18n.use("zh-CN");
    }
  });

  await test("约定：所有框架属性都以 Tenon.PREFIX 开头", () => {
    eq(Tenon.PREFIX, "tn-data", "前缀值");
    eq(Tenon.attr("part"), "tn-data-part", "attr() 用来拼属性名");
    eq(Tenon.attr(), "tn-data");

    /* 1) 每个控件的选择器都要带前缀（含 tn-data-dialog 这类「参数兼作声明」的） */
    const names = Object.keys(Tenon.components);
    assert(names.length >= 10, "控件数不该少于 10，实际 " + names.length);
    const bad = names.filter((n) =>
      String((Tenon.components[n] || {}).selector || "").indexOf(Tenon.PREFIX) < 0);
    eq(bad.join(","), "", "这些控件的选择器没带上前缀：");

    /* 2) 运行时算出来的属性名也要走同一条规则 */
    const saved = Tenon.kit.current;
    Tenon.kit.use({ name: "probe-prefix" });
    const node = Tenon.kit.node("tab");
    assert(node.hasAttribute(Tenon.attr("part")), "node() 应写 " + Tenon.attr("part"));
    Tenon.kit.setState(node, "hasActive", true);
    assert(node.hasAttribute(Tenon.attr("state-has-active")), "setState 应写带前缀的状态");
    assert(Tenon.kit.part("tab").indexOf(Tenon.PREFIX) > 0, "part() 选择器应含前缀");
    assert(Tenon.kit.tpl("tab", { id: "x", title: "X" }).indexOf(Tenon.PREFIX) > 0,
      "tpl() 产出的标记应含前缀");
    Tenon.kit.use(saved);
  });

  await test("kit：node() 造出来的元素，part() 必须能查到", () => {
    const K = Tenon.kit.current;
    const names = Object.keys(K.CLASS || {});
    assert(names.length > 10, "CLASS 表不该是空的");

    const host = mount("<div></div>");
    const missing = [];
    names.forEach((name) => {
      const node = Tenon.kit.node(name);
      host.appendChild(node);
      if (host.querySelector(Tenon.kit.part(name)) !== node) missing.push(name);
      node.remove();
    });
    eq(missing.join(","), "", "这些部件造得出却查不到：");
  });

  await test("kit 骨架：兜底实现下模板与容器一个类名都不带", () => {
    const saved = Tenon.kit.current;
    Tenon.kit.use({ name: "probe-plain" });

    const node = Tenon.kit.node("tab");
    assert(node.hasAttribute("tn-data-part"), "兜底容器只留部件属性");
    assert(!node.className, "兜底容器不该有类名");

    Object.keys(TPL_CASES).forEach((n) => {
      const html = Tenon.kit.tpl(n, TPL_CASES[n]);
      assert(html.length > 0, n + " 模板不该为空");
      assert(!/class[\s=]/.test(html), n + " 模板不该出现类名：" + html.slice(0, 70));
      assert(html.includes("data-"), n + " 模板应保留契约属性");
    });

    eq(Tenon.kit.icon("fold"), "", "兜底实现不给图标");
    assert(Tenon.kit.setState(node, "siderCollapsed", true) && node.hasAttribute("tn-data-state-sider-collapsed"),
      "驼峰状态应写成 kebab 属性");

    Tenon.kit.use(saved);
  });

  /* =========================================================
     控件
     ========================================================= */

  await test("switch：初始态读类名，点击翻转并派发 change", () => {
    const host = mount('<button class="switch on" tn-data="switch"><span class="switch-dot"></span></button>');
    const btn = host.firstElementChild;
    const inst = Tenon.get(btn, "switch");

    assert(inst, "应被扫描到");
    assert(Tenon.kit.hasState(btn, "on"), "初始 on 应被识别");

    let got = "unset";
    host.addEventListener("change", (e) => (got = e.detail.on));

    btn.click();
    assert(!Tenon.kit.hasState(btn, "on"), "点击应关掉");
    eq(got, "false");
    eq(btn.getAttribute("aria-checked"), "false");

    btn.querySelector(".switch-dot").click();   // 点圆点也要生效
    assert(Tenon.kit.hasState(btn, "on"), "点圆点应打开");
    eq(inst.isOn(), "true");
  });

  await test("tabs：点击切 active，面板切 hidden", () => {
    const host = mount(`<div class="card-bd">
      <div class="tabs" tn-data="tabs">
        <button class="tab-item active" data-tab="t1">一</button>
        <button class="tab-item" data-tab="t2">二</button>
      </div>
      <div data-pane="t1">A</div>
      <div data-pane="t2" class="hidden">B</div>
    </div>`);

    const box = host.querySelector('[tn-data~="tabs"]');
    const inst = Tenon.get(box, "tabs");
    const p1 = host.querySelector('[data-pane="t1"]');
    const p2 = host.querySelector('[data-pane="t2"]');

    eq(inst.current(), "t1", "初始应停在 t1");
    assert(Tenon.kit.hasState(p2, "hidden"));

    let key = "";
    host.addEventListener("tenon:tab", (e) => (key = e.detail.key));
    host.querySelector('[data-tab="t2"]').click();

    eq(inst.current(), "t2");
    eq(key, "t2");
    assert(Tenon.kit.hasState(p1, "hidden"), "旧面板应收起");
    assert(!Tenon.kit.hasState(p2, "hidden"), "新面板应展开");
  });

  await test("segmented：点击切 active，事件带 value 与 index", () => {
    const host = mount(`<div class="a-seg" tn-data="segmented">
      <button class="active" data-seg>日</button><button data-seg>周</button></div>`);
    const btns = qsa("[data-seg]", host);

    let payload = "";
    host.addEventListener("tenon:segment", (e) => (payload = e.detail.value + "/" + e.detail.index));
    btns[1].click();

    assert(Tenon.kit.hasState(btns[1], "active"));
    assert(!Tenon.kit.hasState(btns[0], "active"));
    eq(payload, "周/1");
  });

  await test("rate：点亮到第 n 颗，value 同步", () => {
    const host = mount(`<div class="a-rate" tn-data="rate">
      <i class="on"></i><i class="on"></i><i></i><i></i><i></i></div>`);
    const box = host.firstElementChild;
    const inst = Tenon.get(box, "rate");
    const stars = qsa("i", box);

    eq(inst.value(), 2, "初始两颗");

    stars[3].click();                        // 第 4 颗
    eq(inst.value(), 4);
    eq(stars.filter((s) => Tenon.kit.hasState(s, "on")).length, 4);

    inst.set(1);
    eq(stars.filter((s) => Tenon.kit.hasState(s, "on")).length, 1, "set 应重绘");
  });

  await test("optionlist：同一容器内单选", () => {
    const host = mount(`<div class="a-menu" tn-data="optionlist">
      <div class="a-menu-item active" data-option>A</div>
      <div class="a-menu-item" data-option>B</div>
      <div class="a-menu-item" data-option>C</div></div>`);
    const items = qsa("[data-option]", host);

    let text = "";
    host.addEventListener("tenon:option", (e) => (text = e.detail.text + "/" + e.detail.index));
    items[2].click();

    assert(Tenon.kit.hasState(items[2], "active"));
    assert(!Tenon.kit.hasState(items[0], "active"), "旧选中应失效");
    eq(text, "C/2");
  });

  await test("select：单选点选项回写原生 select 并派发 change", () => {
    const host = mount(`<select tn-data="select">
      <option value="">请选择</option>
      <option value="a">苹果</option>
      <option value="b">香蕉</option>
      <option value="c" disabled>樱桃（停用）</option>
    </select>`);
    const sel = host.querySelector("select");
    assert(sel.hidden, "原生 select 应被隐藏");
    assert(Tenon.get(sel, "select"), "实例应可取回");

    let fired = 0;
    sel.addEventListener("change", () => { fired += 1; });

    const trigger = host.querySelector(Tenon.kit.part("selectTrigger"));
    const panel = host.querySelector(Tenon.kit.part("selectPanel"));
    const opts = () => Tenon.core.qsa(Tenon.kit.part("selectOption"), host);
    eq(trigger.textContent.trim(), "请选择", "未选时显示占位");

    trigger.click();
    assert(!Tenon.kit.hasState(panel, "hidden"), "点触发器应展开");
    eq(opts().length, 4, "选项数应与原生一致");

    opts()[2].click();
    eq(sel.value, "b", "选中应回写到原生 select");
    eq(fired, 1, "应派发一次原生 change");
    eq(trigger.textContent.trim(), "香蕉", "触发器显示选中项");
    assert(Tenon.kit.hasState(panel, "hidden"), "单选选完应收起");

    trigger.click();
    opts()[3].click();
    eq(sel.value, "b", "disabled 项点了不该生效");
  });

  await test("select：多选切换、标签展示与搜索过滤", () => {
    const host = mount(`<select tn-data="select" multiple data-search>
      <option value="1">苹果</option>
      <option value="2">香蕉</option>
      <option value="3">樱桃</option>
    </select>`);
    const sel = host.querySelector("select");
    const trigger = host.querySelector(Tenon.kit.part("selectTrigger"));
    const opts = () => Tenon.core.qsa(Tenon.kit.part("selectOption"), host);

    trigger.click();
    opts()[0].click();
    opts()[2].click();
    eq(Array.from(sel.selectedOptions).map((o) => o.value).join(), "1,3", "两项应被选中");
    eq(Tenon.core.qsa(Tenon.kit.part("selectTag"), host).length, 2, "应渲染两个标签");
    assert(!Tenon.kit.hasState(host.querySelector(Tenon.kit.part("selectPanel")), "hidden"),
      "多选不该自动收起");

    opts()[0].click();
    eq(Array.from(sel.selectedOptions).map((o) => o.value).join(), "3", "再点应取消");

    const input = host.querySelector(Tenon.kit.part("selectSearch") + " input");
    input.value = "樱";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const hidden = opts().filter((b) => Tenon.kit.hasState(b, "hidden")).length;
    eq(hidden, 2, "其余两项应被过滤掉");
  });

  await test("popover：Esc 与点外面都能收起，aria-expanded 跟着走", () => {
    const host = mount(`<select tn-data="select">
      <option value="">请选择</option>
      <option value="a">苹果</option>
    </select>`);
    const trigger = host.querySelector(Tenon.kit.part("selectTrigger"));
    const panel = host.querySelector(Tenon.kit.part("selectPanel"));
    const inst = Tenon.get(host.querySelector("select"), "select");

    inst.open();
    assert(!Tenon.kit.hasState(panel, "hidden"), "应先打开");
    eq(trigger.getAttribute("aria-expanded"), "true", "打开时应标记 aria-expanded");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    assert(Tenon.kit.hasState(panel, "hidden"), "Esc 应收起");
    eq(trigger.getAttribute("aria-expanded"), "false", "收起后 aria-expanded 应变回 false");
    assert(!inst.isOpen(), "实例状态应同步");

    inst.open();
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    assert(Tenon.kit.hasState(panel, "hidden"), "点面板外面应收起");
  });

  await test("upload：拖拽加文件、去重、删除，并同步回原生 input", () => {
    const host = mount(`<input type="file" tn-data="upload" multiple data-max-count="3">`);
    const input = host.querySelector("input");
    const inst = Tenon.get(input, "upload");
    const zone = host.querySelector(Tenon.kit.part("uploadZone"));
    const list = host.querySelector(Tenon.kit.part("uploadList"));
    assert(inst, "应初始化成功");

    const mk = (name, size) => new File([new Uint8Array(size)], name, { type: "text/plain", lastModified: 1 });
    const drop = (files) => {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      zone.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
    };

    let payload = null;
    input.addEventListener("tenon:upload", (e) => { payload = e.detail; });

    drop([mk("a.txt", 10), mk("b.txt", 20)]);
    eq(inst.count(), 2, "拖两个应进来两个");
    eq(list.querySelectorAll("li").length, 2, "列表应有两条");
    eq(input.files.length, 2, "应同步回原生 input，FormData 才拿得到");
    assert(payload && payload.files.length === 2, "应派发 tenon:upload");

    drop([mk("a.txt", 10)]);
    eq(inst.count(), 2, "同名同大小同时间的应去重");

    list.querySelector("[data-index]").click();
    eq(inst.count(), 1, "点 × 应删掉一个");
    eq(input.files.length, 1, "删完也要同步回原生 input");
  });

  await test("upload：超过大小上限或数量上限会被拦下", () => {
    /* 0.001 MB ≈ 1048 字节 */
    const host = mount(`<input type="file" tn-data="upload" multiple data-max-size="0.001" data-max-count="2">`);
    const input = host.querySelector("input");
    const inst = Tenon.get(input, "upload");
    const zone = host.querySelector(Tenon.kit.part("uploadZone"));
    const drop = (files) => {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      zone.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
    };
    const mk = (name, size) => new File([new Uint8Array(size)], name, { type: "text/plain", lastModified: 1 });

    drop([mk("big.bin", 2048)]);
    eq(inst.count(), 0, "超过大小上限应被拒");

    drop([mk("1.txt", 10), mk("2.txt", 10), mk("3.txt", 10)]);
    eq(inst.count(), 2, "数量上限 2，第三个应被拒");
  });

  await test("a11y：选项卡有 role / aria-selected，方向键可切换", () => {
    const host = mount(`<div tn-data="tabs">
      <button class="active" data-tab="a">甲</button><button data-tab="b">乙</button>
    </div><div data-pane="a">面板甲</div><div data-pane="b" class="hidden">面板乙</div>`);
    const box = host.querySelector('[tn-data~="tabs"]');
    const inst = Tenon.get(box, "tabs");
    const btns = Tenon.core.qsa("[data-tab]", box);

    eq(box.getAttribute("role"), "tablist", "容器应是 tablist");
    eq(btns[0].getAttribute("role"), "tab");
    eq(host.querySelector('[data-pane="a"]').getAttribute("role"), "tabpanel");
    eq(btns[0].getAttribute("aria-selected"), "true", "默认选中项应标 aria-selected");
    eq(btns[1].getAttribute("aria-selected"), "false");
    eq(btns[0].getAttribute("tabindex"), "0", "选中项占唯一的 Tab 落点");
    eq(btns[1].getAttribute("tabindex"), "-1", "未选中的 tab 不该占 Tab 位");

    btns[0].focus();
    btns[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    eq(inst.current(), "b", "→ 应切到下一个");
    eq(document.activeElement, btns[1], "焦点应跟着走");
    eq(btns[1].getAttribute("aria-selected"), "true");

    btns[1].dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    eq(inst.current(), "a", "Home 应回到第一个");
  });

  await test("a11y：表格列头 aria-sort 跟着排序变", () => {
    const host = mount(`<table tn-data="table">
      <thead><tr><th data-sort="n">数值 <span tn-data-part-sort></span></th></tr></thead>
      <tbody>
        <tr data-row-id="1"><td>2</td></tr>
        <tr data-row-id="2"><td>1</td></tr>
      </tbody>
    </table>`);
    const th = host.querySelector("th");
    eq(th.getAttribute("aria-sort"), "none", "未排序时是 none");

    th.click();
    eq(th.getAttribute("aria-sort"), "ascending", "升序");
    th.click();
    eq(th.getAttribute("aria-sort"), "descending", "降序");
  });

  await test("a11y：下拉与级联都能用键盘操作", () => {
    /* 下拉：↑↓ 移动焦点，回车（button 原生）选中 */
    const s1 = mount(`<select tn-data="select">
      <option value="">请选择</option>
      <option value="a">苹果</option>
      <option value="b">香蕉</option>
    </select>`);
    const sel = s1.querySelector("select");
    const inst = Tenon.get(sel, "select");
    inst.open();

    const items = Tenon.core.qsa(Tenon.kit.part("selectOption"), s1)
      .filter((b) => !Tenon.kit.hasState(b, "hidden"));
    eq(items[0].getAttribute("role"), "option");
    eq(Tenon.core.qs(Tenon.kit.part("selectPanel") + " [role='listbox']", s1) ? "y" : "n", "y",
      "面板里应有 listbox");

    items[0].focus();
    items[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    eq(document.activeElement, items[1], "↓ 应把焦点移到下一项");
    items[1].click();
    eq(sel.value, "a", "选中的应是第二项（苹果）");
    /* 选完列表会重建，必须重新查 —— 拿旧节点断言只会拿到过期的值 */
    const after = Tenon.core.qsa(Tenon.kit.part("selectOption"), s1)
      .filter((b) => !Tenon.kit.hasState(b, "hidden"));
    eq(after[1].getAttribute("aria-selected"), "true", "选中项应标 aria-selected");

    /* 级联：→ 下钻，← 回上一列 */
    const s2 = mount(`<select tn-data="cascader">
      <option value="1">浙江省</option>
      <option value="11" data-parent="1">杭州市</option>
      <option value="111" data-parent="11">上城区</option>
    </select>`);
    const cinst = Tenon.get(s2.querySelector("select"), "cascader");
    const panel = s2.querySelector(Tenon.kit.part("cascaderPanel"));
    cinst.open();

    const col0 = panel.querySelector('[data-col="0"]');
    col0.focus();
    col0.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    eq(panel.querySelectorAll('[data-col="1"]').length, 1, "→ 应下钻进第二列");

    const col1 = panel.querySelector('[data-col="1"]');
    col1.focus();
    col1.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    eq(document.activeElement.dataset.col, "0", "← 应回到上一列");
  });

  await test("cascader：逐级下钻、叶子可选并写回原生 select", () => {
    const host = mount(`<select tn-data="cascader" data-placeholder="选择地区">
      <option value="330000">浙江省</option>
      <option value="330100" data-parent="330000">杭州市</option>
      <option value="330102" data-parent="330100">上城区</option>
      <option value="330106" data-parent="330100">西湖区</option>
      <option value="320000">江苏省</option>
    </select>`);
    const sel = host.querySelector("select");
    const trigger = host.querySelector(Tenon.kit.part("cascaderTrigger"));
    const panel = host.querySelector(Tenon.kit.part("cascaderPanel"));
    const cols = () => Tenon.core.qsa(Tenon.kit.part("cascaderCol"), host);
    const opts = (lv) => Tenon.core.qsa(Tenon.kit.part("cascaderOption"), cols()[lv]);

    let fired = 0;
    sel.addEventListener("change", () => { fired += 1; });

    eq(trigger.textContent.trim(), "选择地区", "未选时显示占位");
    eq(sel.value, "", "分叉节点不该被原生默认选中");

    trigger.click();
    assert(!Tenon.kit.hasState(panel, "hidden"), "点触发器应展开");
    eq(cols().length, 1, "初始只有一列");
    eq(opts(0).length, 2, "根节点应有两个省");

    opts(0)[0].click();                       // 浙江省
    eq(cols().length, 2, "点省后应出现第二列");
    eq(opts(1).length, 1, "浙江省下只有杭州市");

    opts(1)[0].click();                       // 杭州市
    eq(cols().length, 3, "点市后应出现第三列");
    eq(opts(2).length, 2, "杭州市下两个区");

    opts(2)[0].click();                       // 上城区
    eq(sel.value, "330102", "叶子应写回原生 select");
    eq(fired, 1, "应派发一次原生 change");
    assert(Tenon.kit.hasState(panel, "hidden"), "选完应收起");
    eq(trigger.textContent.trim(), "浙江省 / 杭州市 / 上城区", "触发器显示完整路径");

    trigger.click();                          // 重新打开应定位到已选路径
    eq(cols().length, 3, "重开应展开到已选层级");
    assert(Tenon.kit.hasState(opts(2)[0], "active"), "已选项应高亮");

    opts(0)[1].click();                       // 江苏省是叶子根，直接选中
    eq(sel.value, "320000", "叶子根节点可直接选中");
    eq(trigger.textContent.trim(), "江苏省");
  });

  await test("collapse：默认各项独立，可重复开合", () => {
    const host = mount(`<div class="a-collapse" tn-data="collapse">
      <div class="a-collapse-item open"><button data-collapse>一</button></div>
      <div class="a-collapse-item"><button data-collapse>二</button></div>
    </div>`);
    const items = qsa(".a-collapse-item", host);
    const heads = qsa("[data-collapse]", host);

    heads[1].click();
    assert(Tenon.kit.hasState(items[1], "open"));
    assert(Tenon.kit.hasState(items[0], "open"), "非手风琴模式互不影响");

    heads[1].click();
    assert(!Tenon.kit.hasState(items[1], "open"), "再点应收起");
  });

  await test("collapse：tn-data-accordion 开启手风琴，只留一个", () => {
    const host = mount(`<div class="a-collapse" tn-data="collapse" tn-data-accordion>
      <div class="a-collapse-item open"><button data-collapse>一</button></div>
      <div class="a-collapse-item"><button data-collapse>二</button></div>
    </div>`);
    const items = qsa(".a-collapse-item", host);

    qsa("[data-collapse]", host)[1].click();
    assert(Tenon.kit.hasState(items[1], "open"), "新项应打开");
    assert(!Tenon.kit.hasState(items[0], "open"), "兄弟项应被关掉");
  });

  await test("tree：点箭头展开、点行选中、expandTo 打开祖先", () => {
    const host = mount(`<ul class="tree" tn-data="tree"><li>
      <div class="tree-row" data-node="1"><span class="tree-caret" data-caret="1">▶</span><span>集团</span></div>
      <ul class="tree-children hidden"><li>
        <div class="tree-row" data-node="2"><span class="tree-caret" data-caret="0">·</span><span>子</span></div>
      </li></ul>
    </li></ul>`);

    const tree = host.querySelector("ul");
    const inst = Tenon.get(tree, "tree");
    const kids = tree.querySelector(".tree-children");
    const row1 = tree.querySelector('[data-node="1"]');
    const row2 = tree.querySelector('[data-node="2"]');

    assert(Tenon.kit.hasState(kids, "hidden"), "初始应收起");
    row1.querySelector("[data-caret]").click();
    assert(!Tenon.kit.hasState(kids, "hidden"), "点箭头应展开");

    row2.click();
    assert(Tenon.kit.hasState(row2, "active"), "点行应选中");
    assert(!Tenon.kit.hasState(row1, "active"), "同时只选中一个");

    row1.querySelector("[data-caret]").click();
    assert(Tenon.kit.hasState(kids, "hidden"), "再点应收起");

    assert(inst.expandTo("2"), "expandTo 应返回 true");
    assert(!Tenon.kit.hasState(kids, "hidden"), "expandTo 应逐级展开");
  });

  /* =========================================================
     table —— 重点回归：勾选不能因为重绘而丢
     ========================================================= */

  await test("table：按 page-size 切片并渲染分页", () => {
    const host = mount(`<div class="card-bd">
      <table tn-data="table" data-page-size="2" data-pager="#tp">
        <thead><tr><th><input type="checkbox" data-check-all></th>
          <th class="th-sort" data-sort="n">数值 <span class="th-arrow">⇅</span></th></tr></thead>
        <tbody>
          <tr data-row-id="a"><td><input type="checkbox" data-check="a"></td><td>30</td></tr>
          <tr data-row-id="b"><td><input type="checkbox" data-check="b"></td><td>10</td></tr>
          <tr data-row-id="c"><td><input type="checkbox" data-check="c"></td><td>20</td></tr>
        </tbody>
      </table><div id="tp" data-pager></div></div>`);

    const table = host.querySelector("table");
    const inst = Tenon.get(table, "table");

    eq(inst.data.length, 3, "应读到三行原始数据");
    eq(table.tBodies[0].rows.length, 2, "首屏应按 page-size 切");
    assert(host.querySelector("#tp .pager"), "应渲染分页器");
    assert(host.querySelector("#tp").textContent.includes("共 3 条"));
  });

  await test("table：排序切换升/降序，箭头跟着变", () => {
    const host = mount(`<div class="card-bd">
      <table tn-data="table" data-page-size="9">
        <thead><tr><th class="th-sort" data-sort="n">数值 <span class="th-arrow">⇅</span></th></tr></thead>
        <tbody>
          <tr data-row-id="a"><td>30</td></tr>
          <tr data-row-id="b"><td>10</td></tr>
          <tr data-row-id="c"><td>20</td></tr>
        </tbody>
      </table></div>`);

    const table = host.querySelector("table");
    const th = table.querySelector("[data-sort]");
    const arrow = table.querySelector(".th-arrow");
    const order = () => qsa("tbody tr", table).map((tr) => tr.dataset.rowId).join(",");

    eq(order(), "a,b,c", "初始保持原始顺序");
    th.click();
    eq(order(), "b,c,a", "升序");
    eq(arrow.textContent, "▲");
    assert(Tenon.kit.hasState(th, "sorted"));

    th.click();
    eq(order(), "a,c,b", "再点降序");
    eq(arrow.textContent, "▼");
  });

  await test("table：勾选跨排序与翻页保留，并回填到新行", () => {
    const host = mount(`<div class="card-bd">
      <table tn-data="table" data-page-size="2" data-pager="#tp">
        <thead><tr><th><input type="checkbox" data-check-all></th>
          <th class="th-sort" data-sort="n">数值 <span class="th-arrow">⇅</span></th></tr></thead>
        <tbody>
          <tr data-row-id="a"><td><input type="checkbox" data-check="a"></td><td>30</td></tr>
          <tr data-row-id="b"><td><input type="checkbox" data-check="b"></td><td>10</td></tr>
          <tr data-row-id="c"><td><input type="checkbox" data-check="c"></td><td>20</td></tr>
        </tbody>
      </table><div id="tp" data-pager></div></div>`);

    const table = host.querySelector("table");
    const inst = Tenon.get(table, "table");

    table.querySelector('[data-check="a"]').click();
    eq(inst.selected().join(), "a", "勾选应记下来");

    // 升序后 a(30) 排到最后一页，第一页换成 b、c
    table.querySelector("[data-sort]").click();
    eq(inst.selected().join(), "a", "排序不该清空选择");

    // 翻到第二页，a 的复选框必须被回填成已勾
    host.querySelector('#tp [data-page="2"]').click();
    eq(qsa("tbody tr", table)[0].dataset.rowId, "a");
    assert(table.querySelector('[data-check="a"]').checked, "重绘后应回填勾选");

    // 回到第一页，全选只影响当前页可见行
    host.querySelector('#tp [data-page="1"]').click();
    inst.select([]);
    table.querySelector("[data-check-all]").click();
    eq(inst.selected().sort().join(), "b,c", "全选应作用于当前页");
    table.querySelector("[data-check-all]").click();
    eq(inst.selected().length, 0, "再点应清空");
  });

  await test("table：search 过滤、reset 还原、remove 删除", () => {
    const host = mount(`<div class="card-bd">
      <table tn-data="table" data-page-size="9">
        <thead><tr><th>名称</th></tr></thead>
        <tbody>
          <tr data-row-id="a"><td>苹果</td></tr>
          <tr data-row-id="b"><td>香蕉</td></tr>
          <tr data-row-id="c"><td>苹果派</td></tr>
        </tbody>
      </table></div>`);

    const table = host.querySelector("table");
    const inst = Tenon.get(table, "table");
    const rows = () => qsa("tbody tr", table).length;

    inst.search("苹果");
    eq(rows(), 2, "应按文本过滤");

    inst.search("");
    eq(rows(), 3, "清空条件应还原");

    inst.filter((row) => row.cells[0] === "香蕉");
    eq(rows(), 1);

    inst.reset();
    eq(rows(), 3);

    assert(inst.remove("a"), "删除应返回 true");
    eq(rows(), 2);
    assert(!inst.remove("不存在"), "删不到应返回 false");
  });

  await test("table：setData 换数据时清空旧选择", () => {
    const host = mount(`<div class="card-bd">
      <table tn-data="table" data-page-size="9">
        <thead><tr><th><input type="checkbox" data-check-all></th><th>名</th></tr></thead>
        <tbody><tr data-row-id="a"><td><input type="checkbox" data-check="a"></td><td>甲</td></tr></tbody>
      </table></div>`);

    const table = host.querySelector("table");
    const inst = Tenon.get(table, "table");

    inst.select(["a"]);
    eq(inst.selected().join(), "a");

    inst.setData(['<tr data-row-id="x"><td><input type="checkbox" data-check="x"></td><td>乙</td></tr>']);
    eq(inst.data.length, 1);
    eq(inst.selected().length, 0, "换数据后旧选择应作废");
    eq(qsa("tbody tr", table)[0].dataset.rowId, "x");
  });

  await test("table：列头注入拖拽把手，可用 data-resize=off 关掉", () => {
    const host = mount(`<table tn-data="table">
      <thead><tr><th>甲</th><th>乙</th></tr></thead>
      <tbody><tr><td>1</td><td>2</td></tr></tbody>
    </table>`);
    eq(host.querySelectorAll(Tenon.kit.part("colResizer")).length, 2, "每列一根把手");

    const host2 = mount(`<table tn-data="table" data-resize="off">
      <thead><tr><th>甲</th></tr></thead>
      <tbody><tr><td>1</td></tr></tbody>
    </table>`);
    eq(host2.querySelectorAll(Tenon.kit.part("colResizer")).length, 0, "关掉后不注入");
  });

  await test("table：拖拽改列宽，切 fixed 布局并派发 tenon:table-resize", () => {
    const host = mount(`<table tn-data="table">
      <thead><tr><th>甲</th><th>乙</th></tr></thead>
      <tbody><tr><td>1</td><td>2</td></tr></tbody>
    </table>`);
    const table = host.querySelector("table");
    const th0 = table.tHead.rows[0].cells[0];
    const handle = th0.querySelector(Tenon.kit.part("colResizer"));
    const startW = Math.round(th0.getBoundingClientRect().width);

    let detail = null;
    table.addEventListener("tenon:table-resize", (e) => { detail = e.detail; });

    handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 200 }));
    assert(Tenon.kit.hasState(table, "resizing"), "拖动中应有 resizing 状态");

    document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 260 }));
    document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 260 }));

    const cg = table.querySelector("colgroup[tn-data-cols]");
    assert(cg, "应生成 colgroup 记住列宽");
    eq(cg.children.length, 2, "colgroup 应覆盖全部列");
    eq(table.style.tableLayout, "fixed", "应切成 fixed 布局");

    const w = parseInt(cg.children[0].style.width, 10);
    assert(Math.abs(w - (startW + 60)) <= 2, "第一列应加 60，实际 " + w + "（原 " + startW + "）");

    assert(!Tenon.kit.hasState(table, "resizing"), "松手后状态复位");
    assert(detail && detail.index === 0, "事应带列序号");
    assert(detail && Math.abs(detail.width - (startW + 60)) <= 2, "事应带新宽度");
  });

  await test("table：data-sticky 标出吸顶表头与吸附列，并算好 left", () => {
    const host = mount(`<table tn-data="table" data-sticky="head,2">
      <thead><tr><th>甲</th><th>乙</th><th>丙</th></tr></thead>
      <tbody><tr><td>1</td><td>2</td><td>3</td></tr></tbody>
    </table>`);
    const table = host.querySelector("table");
    const ths = [...table.tHead.rows[0].cells];
    const tds = [...table.tBodies[0].rows[0].cells];

    eq(ths[0].getAttribute("tn-data-sticky"), "head col", "表头 + 首列");
    eq(ths[1].getAttribute("tn-data-sticky"), "head col edge", "表头 + 第二列（最后一列冻结，带 edge）");
    eq(ths[2].getAttribute("tn-data-sticky"), "head", "第三列只吸顶");

    eq(tds[0].getAttribute("tn-data-sticky"), "col", "首列吸附");
    eq(tds[1].getAttribute("tn-data-sticky"), "col edge", "最后一列冻结列标 edge，皮肤据此画接缝投影");
    eq(tds[2].getAttribute("tn-data-sticky"), null, "第三列不吸附");

    eq(tds[0].style.left, "0px", "首列贴左边");
    const col0 = Math.round(ths[0].getBoundingClientRect().width);
    eq(parseInt(tds[1].style.left, 10), col0, "第二列的 left 应等于首列宽");
  });

  await test("table：虚拟滚动只渲染可视窗口，滚动后窗口跟着走", async () => {
    const rows = Array.from({ length: 300 }, (_, i) =>
      `<tr data-row-id="${i}"><td>${i}</td><td>第 ${i} 行</td></tr>`).join("");
    const host = mount(`<div style="height:220px;overflow-y:auto">
      <table tn-data="table" data-virtual>
        <thead><tr><th>序号</th><th>名称</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`);
    const wrap = host.querySelector("div");
    const table = host.querySelector("table");
    const bodyRows = () => [...table.querySelectorAll("tbody tr:not([tn-data-spacer])")];

    assert(bodyRows().length < 60, "只应渲染可视窗口，实际 " + bodyRows().length);
    assert(table.querySelector("[tn-data-spacer]"), "应有占位行撑起总高度");

    wrap.scrollTop = wrap.scrollHeight;
    await wait(80);

    const ids = bodyRows().map((tr) => tr.dataset.rowId);
    eq(ids[ids.length - 1], "299", "滚到底应看到最后一行");
    assert(bodyRows().length < 60, "滚动后仍只渲染窗口，实际 " + bodyRows().length);
  });

  await test("table：空表 setData 之后，虚拟滚动照样能量到行高", () => {
    const host = mount(`<div style="height:200px;overflow-y:auto">
      <table tn-data="table" data-virtual>
        <thead><tr><th>序号</th><th>名称</th></tr></thead>
        <tbody></tbody>
      </table></div>`);
    const wrap = host.querySelector("div");
    const table = host.querySelector("table");
    const inst = Tenon.get(table, "table");
    assert(inst, "空表也该初始化成功");

    const rows = Array.from({ length: 200 }, (_, i) =>
      `<tr data-row-id="${i}"><td>${i}</td><td>第 ${i} 行</td></tr>`);
    inst.setData(rows);

    const bodyRows = table.querySelectorAll("tbody tr:not([tn-data-spacer])");
    assert(bodyRows.length > 0 && bodyRows.length < 60,
      "setData 后仍只渲染窗口，实际 " + bodyRows.length);
    assert(table.querySelector("[tn-data-spacer]"), "应有占位行");
    assert(wrap.scrollHeight > 4000,
      "占位行应撑出真实高度，实际 " + wrap.scrollHeight);
  });

  await test("table：不写 data-sticky 时一个标记都不打", () => {
    const host = mount(`<table tn-data="table">
      <thead><tr><th>甲</th><th>乙</th></tr></thead>
      <tbody><tr><td>1</td><td>2</td></tr></tbody>
    </table>`);
    eq(host.querySelectorAll("[tn-data-sticky]").length, 0);
  });

  /* =========================================================
     form / dialog / dropdown
     ========================================================= */

  await test("form：必填校验失败写错误态，通过后清除", () => {
    const host = mount(`<form tn-data-validate>
      <label class="field"><input name="cname" data-rule="required" data-msg="名称必填">
        <span class="err-text"></span></label>
      <label class="field"><input name="tel" data-rule="phone"><span class="err-text"></span></label>
    </form>`);

    const form = host.querySelector("form");
    const inst = Tenon.get(form, "form");
    const name = form.querySelector('[name="cname"]');
    const err = form.querySelector(".err-text");

    assert(!inst.validate(), "空必填应不通过");
    assert(Tenon.kit.hasState(name, "error"), "输入框应标错误");
    assert(Tenon.kit.hasState(err, "show"), "错误文案应显示");
    eq(err.textContent, "名称必填", "应使用 data-msg");

    name.value = "张三";
    form.querySelector('[name="tel"]').value = "13800138000";
    assert(inst.validate(), "填好后应通过");
    assert(!Tenon.kit.hasState(name, "error"), "错误态应清除");
    eq(err.textContent, "");

    eq(inst.serialize().cname, "张三");
  });

  await test("form：规则表可扩展，链式规则按序生效", () => {
    eq(Tenon.form.rules.phone(""), true, "空值不校验格式");
    eq(Tenon.form.rules.phone("13800138000"), true);
    assert(Tenon.form.rules.phone("123") !== true, "非法手机号应返回文案");

    Tenon.form.rules.even = (v) => (!v || Number(v) % 2 === 0 || "必须是偶数");
    const input = el("input");
    input.value = "3";
    input.dataset.rule = "required|even";
    eq(Tenon.form.checkField(input), "必须是偶数");
    input.value = "4";
    eq(Tenon.form.checkField(input), true);
  });

  await test("dialog：点声明式按钮开弹窗，点确定关闭", () => {
    const host = mount('<button tn-data-dialog="alert" data-title="标题甲">弹</button>');
    host.querySelector("button").click();

    const mask = document.querySelector(".modal-mask");
    assert(mask, "应出现弹窗");
    eq(mask.querySelector(".modal-title").textContent, "标题甲");

    mask.querySelector("[data-ok]").click();
    assert(!document.querySelector(".modal-mask"), "点确定应关闭");
  });

  await test("dropdown：声明式菜单含危险项，点选派发事件并收起", () => {
    const host = mount('<button tn-data-dropdown="编辑|复制|删除">更多</button>');
    const btn = host.querySelector("button");

    let hit = "";
    host.addEventListener("tenon:dropdown", (e) => (hit = e.detail.text));

    btn.click();
    const panel = document.querySelector("body > .dropdown");
    assert(panel, "应生成面板");
    eq(panel.querySelectorAll(".dropdown-item").length, 3);
    assert(panel.lastElementChild.classList.contains("danger"), "末项应为危险色");

    panel.querySelector(".dropdown-item").click();
    eq(hit, "编辑");
    assert(!document.querySelector("body > .dropdown"), "点选后应移除");
  });

  await test("ajax.handle：认 statusCode / callbackType / navTabId / skipRefresh", () => {
    const calls = [];
    const had = Object.prototype.hasOwnProperty.call(Tenon, "navtab");
    const real = Tenon.navtab;
    Tenon.navtab = {
      close: (id) => calls.push("close:" + id),
      refresh: (id) => calls.push("refresh:" + id),
      refreshOrOpen: (id) => calls.push("open:" + id),
      currentId: () => "users"
    };

    try {
      eq(Tenon.ajax.handle({ statusCode: "200", message: "" }, {}), true, "200 应返回 true");
      eq(Tenon.ajax.handle({ statusCode: "500", message: "炸了" }, {}), false, "非 200 应返回 false");

      calls.length = 0;
      Tenon.ajax.handle({ statusCode: 200, callbackType: "closeCurrent" }, { tabId: "users" });
      eq(calls.join(), "close:users", "closeCurrent 关掉 ctx 传入的页签");

      calls.length = 0;
      Tenon.ajax.handle({ statusCode: "200", callbackType: "refreshCurrent" }, {});
      eq(calls.join(), "refresh:users", "refreshCurrent 刷新当前页签");

      calls.length = 0;
      Tenon.ajax.handle({ statusCode: "200", navTabId: "form" }, {});
      eq(calls.join(), "open:form", "navTabId 刷新或打开目标页签");

      calls.length = 0;
      Tenon.ajax.handle({ statusCode: "200", callbackType: "refreshCurrent", navTabId: "form" }, { skipRefresh: true });
      eq(calls.join(), "", "skipRefresh 时两种刷新都跳过");
    } finally {
      if (had) Tenon.navtab = real;
      else delete Tenon.navtab;
    }
  });

  /* =========================================================
     反馈链路
     ========================================================= */

  await test("ui.toast：挂到宿主容器", () => {
    Tenon.ui.toast("自检提示", "success");
    const list = qsa("#toast-root .toast");
    assert(list.length >= 1, "应出现提示");
    assert(list[list.length - 1].textContent.includes("自检提示"));
  });

  await test("ui.loading：显示并可关闭（此前是坏 API）", () => {
    const off = Tenon.ui.loading("载入中");
    const mask = document.querySelector(".tn-loading-mask");
    assert(mask, "应出现遮罩");
    assert(mask.textContent.includes("载入中"));
    off();
    assert(!document.querySelector(".tn-loading-mask"), "应被移除");

    // 再开一次，验证状态没被锁死
    const off2 = Tenon.ui.loading();
    assert(document.querySelector(".tn-loading-mask"), "应能再次打开");
    off2();
  });

  await test("ui.confirm：确认后触发回调，取消不触发", () => {
    let ok = 0, closed = 0;
    Tenon.ui.confirm("删除", "不可恢复", () => ok++, { onClose: () => closed++ });

    const mask = document.querySelector(".modal-mask");
    assert(mask.querySelector(".confirm"), "应有确认区");
    mask.querySelector("[data-cancel]").click();
    eq(ok, 0, "取消不该触发 onOk");
    eq(closed, 1, "取消应触发 onClose");

    Tenon.ui.confirm("删除", "不可恢复", () => ok++);
    document.querySelector(".modal-mask [data-ok]").click();
    eq(ok, 1);
  });

  await test("ui.modal：Esc 只关最上层", async () => {
    Tenon.ui.modal({ title: "下层", body: "a" });
    Tenon.ui.modal({ title: "上层", body: "b" });
    eq(qsa(".modal-mask").length, 2);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    eq(qsa(".modal-mask").length, 1, "应只关一层");
    eq(document.querySelector(".modal-title").textContent, "下层", "留下的是下层");
  });

  /* =========================================================
     chart
     ========================================================= */

  await test("chart：三种图返回 SVG 字符串", () => {
    const data = [{ k: "一", v: 10 }, { k: "二", v: 20 }];
    ["bar", "line", "pie"].forEach((kind) => {
      const svg = Tenon.chart[kind](data);
      assert(svg.startsWith("<svg"), kind + " 应返回 svg");
      assert(svg.includes("</svg>"), kind + " 应闭合");
      assert(svg.includes('role="img"'), kind + " 应带 role");
    });
  });

  /* =========================================================
     收尾
     ========================================================= */

  await test("收尾：无残留浮层与夹具", () => {
    eq(qsa(".modal-mask").length, 0, "不该残留弹窗");
    eq(qsa(FX + " > div").length, 0, "不该残留夹具");
  });

  /* ---------------- 输出 ---------------- */

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  qs("#sum").innerHTML =
    '<span>共 <b>' + results.length + "</b> 项</span>" +
    '<span class="pass">通过 <b>' + passed + "</b></span>" +
    '<span class="' + (failed ? "fail" : "pass") + '">失败 <b>' + failed + "</b></span>";

  qs("#out").innerHTML = results
    .map((r) =>
      '<li class="' + (r.ok ? "ok" : "no") + '">' +
        '<span class="tag">' + (r.ok ? "PASS" : "FAIL") + "</span>" +
        '<span class="name">' + r.name +
          (r.ok ? "" : '<span class="err">' + r.err + "</span>") +
        "</span>" +
      "</li>")
    .join("");

  document.title = "Tenon 自检 · " + passed + "/" + results.length + (failed ? " 有失败" : " 全通过");
  window.__selfTest = { total: results.length, passed, failed, results };
})();
