# Web Admin — Tenon 框架演示程序

这是 **Tenon（榫）** 框架的完整演示：一个后台管理系统。框架本体在项目根的 `../../src`，
本目录（`examples/web-admin/`）只放业务侧的东西——页面片段、页面脚本、样式、Mock 数据、外壳 HTML。

> **想知道框架怎么用，看 [`../../src/README.md`](../../src/README.md)。**
> 这份文档只讲「这个 demo 有什么、怎么跑起来」。

演示了什么：

- **页面是 HTML 片段**（`pages/*.html`，30 个），页签打开时按需 fetch，不由 JS 拼字符串；
- **控件靠属性激活**（`tn-data="table"` 这类），页面里不写 `new XXX()`；
- **菜单写在 `index.html` 里**，没有菜单配置文件——改菜单就是改 HTML；
- **皮肤可替换**：`assets/css/*` + `../../src/ui/tenon.kit.antd.js` 组成 Ant Design 皮肤；
  另有一套零类名的皮肤实证在 `../../src/showcase/`，那份连 kit 文件都没有，只有一份 CSS；
- **本 demo 自己的控件**放在 `demo/`，同样走 `Tenon.component` 注册，不污染框架。

参考 [dwz_jui](https://gitee.com/dwzteam/dwz_jui) 的组织方式：保留 **navTab 页签 + 服务端协议驱动**
的核心思想，去掉 jQuery，改为原生 JavaScript + 语义化 CSS。

## 快速开始

本 demo 在 `examples/web-admin/`，框架在项目根的 `src/`，两者隔两级目录，所以**静态服务器的根必须是项目根**，
不能只托管 `examples/web-admin/`：

```bash
cd tenon                   # 项目根（含 src/ 与 examples/）
python -m http.server 8123
# 打开 http://127.0.0.1:8123/examples/web-admin/
```

原因是 `index.html` / `login.html` 用 `../../src/...` 引用框架；只托管 `examples/web-admin/`
会让 `../../src` 落到服务器根之外，全部 404。

也可以直接用 Nginx / Apache 把项目根指向这个目录。

首次访问会落到 `login.html`，任意非空用户名 + 密码即可进入（纯前端演示，不做真实校验）。

## 登录与鉴权

登录态由 `../../src/shell/tenon.auth.js` 统一管理，四个 API：

| API | 说明 |
|---|---|
| `Tenon.auth.user()` | 返回 `{ name, at }`，未登录返回 `null` |
| `Tenon.auth.login(name, remember)` | 写入登录态；`remember` 为真写 `localStorage`，否则写 `sessionStorage` |
| `Tenon.auth.logout()` | 清空两处存储，并 `location.replace("login.html")` |
| `Tenon.auth.guard()` | 未登录则跳登录页，返回布尔值 |

存储键统一为 `web-admin:user`，值形如 `{"name":"zhangsan","at":1763548800000}`。
目录从 `web-admin/` 搬到 `examples/web-admin/` 时**存储键没有跟着改名**（`data-app="web-admin"`），
这样已有的登录态与主题色不会因为换目录而失效。

**守卫必须前置**。`index.html` 在 `<head>` 内、所有 DOM 工具加载之前就执行：

```html
<script src="../../src/core/tenon.core.js"></script>
<script src="../../src/shell/tenon.theme.js"></script>
<script src="../../src/shell/tenon.auth.js"></script>
<script>Tenon.auth.guard();</script>
```

两个原因：
1. `tenon.auth.js` 故意不依赖 `Tenon.core`（DOM 工具 / 注册表），只要求命名空间存在，
   所以能在 `document.body` 还不存在时就跑；`tenon.core.js` 放在最前面就是为了先立住这个命名空间。
2. 如果等启动器再判断，用户会先看到后台骨架闪一下再跳走，观感很差。

跳转用 `location.replace` 而非 `href`，这样浏览器回退键不会退回到受保护页面。

登录页 `login.html` 的行为：

- 提交时先本地校验用户名 / 密码非空，失败显示错误文案，停在原页不进后台；
- 通过后 `Tenon.auth.login()` → `setTimeout(..., 220)` → `location.replace("index.html")`；
  （220ms 是留给按钮 loading 态的最小值，纯视觉过渡，可去掉）
- 若已登录，副标题会提示「当前已登录 xxx，可直接进入后台」，避免重复登录的困惑。

> 这是纯前端演示：登录态只是浏览器存储，任何人改一下 `localStorage` 就能进。
> 接真实后端时应改为「登录接口拿 token → 每次请求带 token → 401 跳登录页」，
> 把 `tenon.auth.js` 的 `user()` 换成校验 token 是否过期即可，页面与控件都不用改。

## 目录结构

```
tenon/                              ← 静态服务根指向这里
├── src/                           ← 框架本体（见 ../../src/README.md），本 demo 只引用、不拥有
└── examples/
    └── web-admin/                 ← 本目录：演示程序
        ├── login.html             # 登录页（左品牌区 + 右表单，已登录会自动提示）
        ├── index.html             # 外壳：侧边栏菜单（静态 HTML）+ 页头 + 页签条 + 面包屑 + 工作区
        ├── e2e.html               # 端到端回归：交互断言 + 全量页面，需 http 服务
        ├── e2e-login.html         # 登录流程回归：空提交 / 登录 / 退出 / 记住我
        ├── demo/demo.i18n.js      # 语言切换（宿主侧）：页面名 / 分组名的英文对照
        ├── pages/                 # 30 个页面片段（无 html/head/body，根元素带 data-page / data-script）
        │   ├── dashboard.html     #   工作台
        │   ├── users.html  query.html   #   用户管理 / 客户查询
        │   ├── form.html   tree.html    #   表单录入 / 树形菜单
        │   ├── my-customers.html  …     #   典型页面 9 个
        │   ├── antd-general.html  …     #   组件库 7 个分类页（55 个示例）
        │   └── profile.html             #   个人中心（不进侧边栏，由账号下拉进入）
        ├── pages-script/          # 页面级业务脚本，按 data-script 懒加载（17 个）
        │   ├── users.js           #   增删改 + 搜索（表格能力来自 tenon.table）
        │   ├── query.js  form-query.js  my-customers.js   #   条件筛选
        │   ├── tree.js   flow-*.js      profile.js        #   联动 / 审批 / 账号
        │   └── interact.js  list-input.js  …              #   需要页面自有状态的演示
        ├── demo/                  # 本 demo 专属控件（不属于框架，但走同一套注册机制）
        │   ├── demo.codesample.js #   组件库的示例代码：DOM 序列化 + 高亮 + 复制
        │   ├── demo.anchor.js     #   组件库的右侧锚点导航 + 滚动高亮
        │   └── demo.boot.js       #   外壳装配：菜单索引 → 页签 → 账号菜单（原 src/shell/tenon.boot.js）
        ├── mock/
        │   └── db.js              # Mock 数据 + MOCK_ROUTES 接口路由
        └── assets/
            ├── css/               # tokens / base / components / demo-pages / antd / workplace / theme / login
            └── vendor/fontawesome/ # Font Awesome 6.7.2 Free（本地自托管，见 NOTICE.md）
```

框架与 demo 的分界线很清楚：

| 判据 | 归 `../../src` | 归 `examples/web-admin` |
|---|---|---|
| 换一个后台系统还要不要它 | 要 | 不要 |
| 它认不认识具体业务字段 | 不认识 | 认识 |
| 它是不是只在组件库演示页用 | 不是 | 是（→ `demo/`） |

`demo.codesample.js` / `demo.anchor.js` 原本在框架里，因为选择器绑在 `.api-demo` / `.api-nav`
这些演示页的类名上，搬出来后框架里再没有一个控件读 CSS 类。

另外三条边界是后面划清的：

- **`index.html` 里的骨架类名归皮肤**（`.app` / `.sider` / `.menu-group` / `.tabbar-wrap` …）。
  换皮肤时这段 HTML 与 `assets/css/*` 一起换；`../../src/shell/*.js` 一行不动，
  它只认 id（`#tabbar` `#workarea` `#crumb` `#menu` …）与 `data-*` 契约。
- **外壳的标记由 kit 渲染**：页签、面包屑、飞出层、菜单项、主题抽屉都走
  `Tenon.kit.node("tab")` / `Tenon.kit.tpl("crumb", {…})`，所以 `src/shell` 里搜不到类名字面量。
- **框架自带自检页** `../../src/selftest.html`（56 条断言，刻意不引本目录的 CSS）。
  改完框架先跑它，比逐页点菜单快得多。

菜单结构（6 个一级分组 / 29 个页面）：

| 一级分组 | 二级页面 |
|---|---|
| 仪表盘 | 工作台、分析页 |
| 数据管理 | 用户管理、客户查询 |
| 典型页面 | 查询我的客户、表单查询、表单录入、文本表单、带提示表单、选项卡和图形、选项卡切换图形、左右互动、列表输入、双层栏目列表 |
| 交互组件 | 选项卡面板、弹窗、提示、树形菜单 |
| 组件库 | 通用、布局、导航、数据录入、数据展示、反馈、其他、**框架能力** |
| 流程 | 待办任务、新建流程、我的流程 |

侧边栏之外还有 1 个隐藏页：**个人中心**（`profile`，链接写在 `index.html` 的 `#menu-extra` 里，由账号下拉打开）。

## 布局骨架

外壳按 Ant Design Pro 的经典排布，自上而下四层，每层各占一行：

```
.app
├── .sider                      # 侧边栏（224px，折叠后 64px）
└── .main                       # flex column
    ├── .header                 # ① 页头 56px：[折叠钮] ······ [齿轮] [头像 名称]
    │   ├── #sider-toggle       #   折叠 / 展开按钮（fa-outdent ⇄ fa-indent）
    │   └── .user-wrap          #   右侧工具区：主题齿轮 + 账号按钮（头像在左、名称在右）
    ├── .tabbar-wrap            # ② 页签条 44px：‹ [页签…] › ······ ⋮
    │   ├── [data-tab-scroll="-1"]   #   左箭头（仅溢出时出现）
    │   ├── #tabbar                  #   页签容器，隐藏滚动条
    │   ├── [data-tab-scroll="1"]    #   右箭头（仅溢出时出现）
    │   └── #tab-more                #   ⋮ 全部标签页（margin-left:auto 贴右）
    ├── .pagehead               # ③ 面包屑行 44px（一级分组 / 当前页）
    └── .workarea               # ④ 内容区，padding 24px
```

| 层次 | 样式要点 |
|---|---|
| 页头 | 白底 + `box-shadow: 0 1px 4px rgba(0,21,41,.06)`，只有折叠钮与用户区，`justify-content: space-between` |
| 页签条 | 白底 + `border-bottom: 1px solid var(--border-2)`；`align-items: center`，内部 `#tabbar` 用 `align-items: flex-end` 让页签**贴住分隔线** |
| 页签 | 上圆角卡片 `border-radius: 6px 6px 0 0`、高 38px、字号 14px；未选中 `--bg-2` 底 + `rgba(0,0,0,.08)` 描边 + `--text` 文字；选中 `--white` 底 + `rgba(0,0,0,.06)` 描边 + `--primary` 文字 |
| 页签宽度 | `#tabbar` 用 `flex: 0 1 auto` + `max-width: 100%` —— **宽度只包住页签**，页签少了是一小段，多了才撑满并在内部滚动 |
| 关闭按钮 | 常显（`--text-3`），悬停时圆底加深；不再用 `opacity: 0` 的悬停隐现，避免点不到 |
| 无滚动条 | `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`，用左右箭头 `scrollBy({ left: ±220, behavior: "smooth" })` 翻页 |
| 箭头显隐 | 按 `scrollWidth / clientWidth / scrollLeft` 实时判断：不溢出两个都不显示，滚到最左/最右对应箭头隐藏 |
| 右端留白 | `#tabbar { padding-right: 8px }`，滚到最右时最后一个页签不会贴住 ⋮ |
| ⋮ 按钮 | 竖排三点 `fa-ellipsis-vertical`，`color: var(--primary)`，`margin-left: auto` 贴右 |
| 面包屑 | 独立一行白底、无下边框（靠内容区灰底分隔），`一级分组 / 当前页` 两段，分组只作展示、当前页高亮 |
| 空态 | 页签为 0 时 `.tabbar-wrap` 加 `.is-empty` 整条收起，`.pagehead` 同步隐藏，内容区直接顶到页头下 |
| 焦点回流 | 打开 / 切换页签后 `scrollTabIntoView()` 用 `offsetLeft` 把页签完整拉进可视区 |

> 页签容器不要写 `flex: 1`，否则容器会横贯整行，一个页签时右侧留出一大片空白。
> 需要限制宽度又保留滚动能力时，`flex: 0 1 auto` + `max-width: 100%` + `overflow-x: auto` 是可用组合。

## 账号菜单

页头右上角的账号按钮是**头像在左、名称在右**的一整块按钮（`button.user`），点击弹出下拉：

```
┌──────────────────────┐
│  👤  个人中心         │  ← 打开 profile 页签
│  ⚙  个人设置         │  ← Toast 提示（示例占位）
├──────────────────────┤
│  ⤴  退出登录         │  ← 确认后清登录态回登录页
└──────────────────────┘
```

| 项 | 图标 | 行为 |
|---|---|---|
| 个人中心 | `fa-regular fa-user` | `Tenon.navtab.open("profile")`，tab 标题与面包屑自动正确 |
| 个人设置 | `fa-solid fa-gear` | 等同于点页头的齿轮，打开「主题设置」抽屉 |
| 退出登录 | `fa-solid fa-arrow-right-from-bracket` | `Tenon.ui.confirm` 二次确认 → `Tenon.auth.logout()` |

> 退出确认与「个人中心」页的退出按钮共用同一段逻辑（标题、文案、按钮文字都一致），
> 避免同一个动作在菜单里点了就走、在页面里还要再确认一次。

结构上与「主题齿轮」并列放在 `.user-wrap` 里，下拉由 `boot.js` 的 `ensureUserMenu()` 懒创建、
挂到 `body` 上并用 `position: fixed` 定位：

```js
const r = trigger.getBoundingClientRect();
menu.style.left = Math.round(r.right - menu.offsetWidth) + "px";  // 右边缘对齐触发器
menu.style.top  = Math.round(r.bottom + 6) + "px";
```

- 触发器同步 `aria-expanded="true"`，展开时底色变 `--primary-bg`；
- 点空白 / `Esc` / 滚动 / 缩放窗口收起（与页签右键菜单同一套逻辑）；
- 名称取自 `Tenon.auth.user().name`，头像取首字母大写（`zhangsan` → `Z`），未登录兜底 `admin` / `A`。

> **权重坑**：`base.css` 在 `components.css` **之前**加载，`.user-menu` 与 `.dropdown` 同为 0,1,0，
> 会被后者的 `min-width: 132px` / 行高 34px 覆盖。所以选择器必须写成 `.dropdown.user-menu`（0,2,0）
> 才能拿到 168px 宽度和 38px 行高。改这类「给既有组件加变体」的样式时，先确认文件加载顺序。

## 用到的框架能力

框架本体在 `../../src`（30 个文件 / 4443 行），四层结构与约定见 [`../../src/README.md`](../../src/README.md)。
本节只列 **这个 demo 用到了哪些**。

### 控件速查

所有控件都靠 `tn-data` 声明，扫描器扫到就初始化——页面里没有一行 `new XXX()`。

| 控件 | 声明方式 | 本 demo 用在哪 |
|---|---|---|
| 选项卡 | `<div class="tabs" tn-data="tabs">` + `[data-tab]` / `[data-pane]` | 典型页面、交互组件、组件库 |
| 表格 | `<table tn-data="table" data-page-size="8" data-pager="#p">` + `[data-sort]` `[data-check]` `[data-check-all]` | 用户管理、客户查询、我的客户、表单查询 |
| 树 | `<ul class="tree" tn-data="tree">` + `[data-node]` + `[data-caret]` | 树形菜单 |
| 表单 | `<form tn-data-validate data-action="/api/x">` + `[data-rule="required\|phone"]` | 表单录入、流程新建 |
| 弹窗 | `tn-data-dialog="alert\|confirm\|drawer\|#模板id"` | 弹窗页、用户管理增删改 |
| 下拉 | `tn-data-dropdown="编辑\|复制\|删除"` | 表格行操作、账号菜单 |
| 开关 | `<button class="switch" tn-data="switch">` | 选项卡面板、组件库数据录入 |
| 折叠 | `<div class="a-collapse" tn-data="collapse">` + `[data-collapse]` | 组件库数据展示 |
| 分段 | `<div class="a-seg" tn-data="segmented">` + `[data-seg]` | 组件库数据展示 |
| 评分 | `<div class="a-rate" tn-data="rate">` | 组件库数据录入 |
| 选中列表 | `<div class="a-menu" tn-data="optionlist">` + `[data-option]` | 组件库导航 |
| Toast | `tn-data-toast="success" tn-data-text="已保存"` | 全局 |
| 页签跳转 | `href="pages/x.html"` 或 `data-view` / `data-goto` | 侧边栏菜单 |

`class` 只是皮肤的样式钩子，**换皮肤时改它，`tn-data` 不动**。

### demo/ 里的三件事

| 东西 | 文件 | 为什么在 demo 而不是框架 |
|---|---|---|
| 示例代码控件 | `demo/demo.codesample.js` | 选择器绑 `.api-demo`，把示例 DOM 序列化成带高亮的代码块，并做复制 |
| 锚点导航控件 | `demo/demo.anchor.js` | 选择器绑 `.api-nav`，右侧目录 + 滚动高亮 |
| 外壳装配 | `demo/demo.boot.js` | 里面写着「个人中心 / 个人设置 / 退出登录」这些动作，是**本 demo 的**账号菜单。框架里留一份知道你叫 `profile` 的代码，换个后台就得改框架 |

前两个是控件，第三个别名叫 boot：它只是 `accordion.init()` → `navtab.init()` →
`navtab.start()` 三行 + 账号菜单绑定。`../../src/showcase/index.html` 里没有它，一样跑得起来。

它们通过 `Tenon.component` 注册、通过 `Tenon.init` 被扫描，与框架自带控件走完全相同的机制——
这也是「框架留了扩展点」的实证，而不是嘴上说说。

控件不认识业务：树只派发 `tenon:tree-select`，表格只派发 `tenon:table-change`，
由页面脚本订阅后做自己的事。这是「组件化」和「把业务塞进组件」的分界线。

## 核心约定

### 1. 页面片段

`pages/<id>.html` 是一个 HTML 片段，没有 `html/head/body`，只有一个根元素：

```html
<div class="stack" data-page="users" data-script="users">
  <section class="card"> … </section>
</div>
```

- `data-page` 是页面身份，也是页签 id；
- `data-script` 可选，声明后自动加载 `pages-script/<name>.js`；没有脚本的页面就是纯 HTML；
- 加载流程：`fetch` → 插入 pane → `Tenon.init(pane)` 初始化控件 → 加载并执行页面脚本。

`refresh` 走同一条路：`Tenon.destroy(pane)` 回收旧实例 → 重新 fetch → 重新初始化。
所以**片段必须是幂等的静态标记**，不能带「上次运行的残留状态」。

### 2. 组件注册

```js
Tenon.component("switch", {
  selector: '[tn-data~="switch"]',        // 读属性，不读类名
  init(btn) {
    const off = Tenon.core.on(btn, "click", '[tn-data~="switch"]', () => {
      Tenon.kit.setState(btn, "on", !Tenon.kit.hasState(btn, "on"));
    });
    return { destroy: off };               // 返回值挂到 el.__tn.switch
  },
  destroy(node, inst) { inst.destroy(); }
});
```

`Tenon.init(root)` 会遍历注册表，命中选择器且没初始化过的节点才执行，
并在节点上打 `tn-data-done="<控件名>"` 标记，因此**重复调用安全**。取实例用 `Tenon.get(el, "switch")`。

### 3. 新增一个页面（三步）

1. 写 `pages/report.html`（根元素加 `data-page="report"`）；
2. 在 `index.html` 的菜单里加一行 `<a class="menu-item" href="pages/report.html" data-view="report">统计报表</a>`；
3. 需要业务逻辑时再写 `pages-script/report.js`，并把根元素改成 `data-script="report"`。

页签标题、面包屑分组都从菜单链接读（`a` 的文本 + 所在分组的 `.mt`），**不用再登记第二处**。

**不需要出现在侧边栏的页面**（如个人中心），把链接写进 `index.html` 的 `#menu-extra`：

```html
<div id="menu-extra" hidden>
  <a class="menu-item" href="pages/profile.html" data-view="profile" data-group="账号">个人中心</a>
</div>
```

它会计入 `Tenon.menuMap`（页签标题、面包屑分组正确），但不渲染在侧边栏。

### 4. 新增一个控件

**框架级控件**（换任何后台都要用）→ 放 `../../src/ui/`：

1. 新建 `../../src/ui/tenon.<name>.js`，写 `Tenon.component("<name>", { selector: '[tn-data~="<name>"]', init, destroy })`；
2. `init` 里只用 `Tenon.kit.setState / hasState / part`，**不写类名**；
3. 在 `index.html` 的控件区加一行 `<script src="../../src/ui/tenon.<name>.js"></script>`；
4. 页面写 `<div tn-data="<name>">` 即可被扫描到。

**只服务本 demo 的控件**（比如只给组件库演示页用）→ 放 `demo/`：

1. 新建 `demo/demo.<name>.js`，同样调 `Tenon.component`，但选择器可以直接绑演示页的类名；
2. 在 `index.html` 的 `demo/` 区加 `<script>`；
3. 框架不需要知道它的存在。

两条硬要求，两种控件都适用：

- 组件内部**只用事件委托**（`Tenon.core.on`），因为片段随时会被整体替换；
- 定时器 / 全局监听 / `ResizeObserver` 必须在 `destroy` 里回收。

### 5. 框架响应协议

所有 POST 返回统一结构，由 `Tenon.ajax.handle(res, ctx)` 自动处理：

```json
{
  "statusCode": "200",
  "message": "保存成功",
  "callbackType": "closeCurrent",
  "navTabId": "users"
}
```

| 字段 | 说明 |
|---|---|
| `statusCode` | `"200"` 成功，其他值弹出错误提示 |
| `message` | Toast 文案 |
| `callbackType` | `closeCurrent` 关闭当前页签 / `refreshCurrent` 刷新当前页签 / `none` 不处理 |
| `navTabId` | 需要刷新或打开的目标页签 id |

示例：表单页提交成功后 `closeCurrent + navTabId=query`，即自动关闭表单页并刷新客户列表。
页面自己更新了 DOM 时，用 `handle(res, { skipRefresh: true })` 跳过整页刷新。

### 6. 数据与接口
`mock/db.js` 同时提供数据（`MOCK_DB`）和路由（`MOCK_ROUTES`）。
接入真实后端时：删除 `mock/`，把 `tenon.ajax.js` 里的 `MOCK_ROUTES` 调用换成 `fetch`，
页面与控件都不用改。

## 首页常驻不可关闭

「工作台」是首页页签（`tenon.navtab.js` 里 `const HOME = "dashboard"`、`const isFixed = (id) => id === HOME`），
它不属于「可关闭页签」，所有关闭入口都绕不过去：

| 入口 | 表现 |
|---|---|
| 页签上的 `×` | 首页根本不渲染关闭按钮（加 `.tab-fixed` 类，`padding-right: 16px` 补位） |
| `close(id)` API | 函数开头 `if (isFixed(id)) return;` 直接返回 |
| 右键 →「关闭标签页」 | 置灰不可点（`.disabled`），悬停无高亮 |
| 右键 →「关闭其它标签页」 | 保留当前页签的同时，首页也一并保留 |
| 「关闭全部标签页」 | 只关可关闭项，然后回到首页；没有可关闭项时该菜单项置灰 |
| `⋮` 下拉里首页那一行 | 不渲染 `×`，点整行只切换 |

`closeAll()` 的实际逻辑是「关掉所有可关闭页签 → 若首页还在就激活它」，所以永远剩
`["工作台"]` 并处于激活态，不会落到「请选择左侧菜单」的空态。

**为什么把规则放在 tabs 层而不是 UI 层**：五个入口（页签 DOM、`close()`、右键菜单、⋮ 菜单、
`closeOthers`）都从 `isFixed()` 取值，加新入口时只要复用这个判断就不会漏。如果只改 DOM 不渲染 `×`，
右键和 ⋮ 菜单仍能关掉首页。

## 页签右键操作

在任意页签上点右键，弹出上下文菜单（对标 jui 的标签页右键菜单）：

| 菜单项 | 快捷键 | 行为 |
|---|---|---|
| 刷新标签页 | `R` | 重新执行 `view.render()` 并替换内容，不重建页签 |
| 关闭标签页 | `W` | 关闭当前页签，自动激活相邻页签；**首页置灰** |
| 关闭其它标签页 | — | 只保留当前页签与首页（仅剩一个可关闭页签时置灰） |
| 关闭全部标签页 | — | 关闭所有可关闭页签并回到首页 |

- 菜单位置会自动避开视口边界（右侧/底部空间不足时向左、向上翻转）；
- 点击空白处、按 `Esc`、滚动页面、缩放窗口都会自动收起；
- 被右键的页签会加 `.ctx-target` 底色，便于确认操作对象；
- 相关 API：`Tenon.navtab.closeOthers(id)` / `Tenon.navtab.closeAll()`。

样式复用 `components.css` 的 `.dropdown` 系列，也是「组件库 → 导航 → Dropdown」示例所用的同一套类。

## 地址栏同步

`index.html` 的页签条上写了 `data-sync="hash"`，所以当前页签与地址栏是绑在一起的：

| 场景 | 表现 |
|---|---|
| 从菜单打开用户管理 | 地址栏变成 `#/users` |
| 按浏览器后退 | 回到上一个页签；那个页签关了就重开一份 |
| 刷新页面 | 直接停在当前这一页，不会退回工作台 |
| 把链接发给同事 | 对方打开就是这一页（首次进入会少一个工作台页签） |
| 全部关掉 | 地址栏清空，工作区显示「请选择左侧菜单」 |

实现只在 `../../src/shell/tenon.navtab.js` 的 `activate()` 一处写入，因此不管从菜单、
面包屑、⋮ 列表还是页面脚本里跳，地址栏都会跟上。

不想让地址栏变化，把 `data-sync` 去掉即可，其余行为不变。

## 全部标签页（⋮）

页签条最右侧的 `⋮` 按钮（`#tab-more`，竖排三点、主色）是页签溢出时的兜底入口，下拉内容：

```
工作台             ← 首页无 ×，点击只切换
分析页  ×          ← 点击切换，点 × 单独关闭
────────────────
关闭其它标签页      ← 无可关闭项时置灰
关闭全部标签页
```

- 与右键菜单共用同一份状态（`tabs` Map + `current`），操作结果一致；
- 面板右对齐到按钮、`max-height: 60vh` 内部滚动，靠近视口底部时向上翻转；
- 点击空白 / `Esc` / 滚动 / 缩放窗口都会收起；
- 页签为零时按钮与整条页签条一起隐藏，不会出现空白面板或空条。

## 侧边栏折叠

页头最左侧按钮切换 `.app.sider-collapsed`，宽度从 224px 收到 64px（`transition: width .2s`）。
折叠后只保留：

| 元素 | 折叠态表现 |
|---|---|
| `.logo` | 只留 `W` 徽标，标题与副标题 `display: none` |
| `.menu-parent` | 40×40 居中方块，只显示 `.mi` 图标；`.mt` / `.chev` 隐藏 |
| `.menu-children` | 整块隐藏，二级菜单改由飞出层承载 |
| `.sider-foot` | 隐藏 |

折叠态悬停一级图标会弹出 `.menu-flyout`（`position: fixed`，挂在 `body` 上）：

- 左侧位置固定按 `siderLeft + 64 + 8` 计算 —— 若直接读 `.menu-parent` 的实时矩形，
  在宽度过渡途中会取到中间值，飞出层会错位；
- 内部是分组标题 + 二级页面列表，当前页高亮；点击可直接切换页签；
- 鼠标离开侧栏后延迟 160ms 收起，方便从图标移入飞出层。

## 侧边栏菜单

菜单分两级，遵循 Ant Design Pro 的导航规范；图标使用 **Font Awesome 6**（本地自托管）：

```
.menu-group                      # 一个一级分组（可折叠）
├── .menu-parent                 # 一级：16px 图标 + 标题 + 折叠箭头
│   ├── .mi > i.fa-solid         # Font Awesome 图标（颜色取自 currentColor）
│   ├── .mt                      # 标题
│   └── .chev > i.fa-chevron-down # 折叠箭头，展开时整块旋转 180°
└── .menu-children               # 二级容器
    └── .menu-item               # 二级：无图标，padding-left 46px 与父级标题对齐
```

| 状态 | 表现 |
|---|---|
| 一级常态 | 文字 `--text-2`，图标同步继承 |
| 一级所在分组含激活页 | 加 `.has-active`，文字与图标变 `--primary`，分组自动展开 |
| 二级悬停 | 背景 `rgba(0,0,0,.03)`、文字变 `--primary` |
| 二级选中 `.active` | 背景 `--primary-bg`、文字 `--primary`、字重 500、右侧 3px `::after` 色条 |
| 键盘聚焦 `:focus-visible` | **只加深底色 `rgba(0,0,0,.06)`，不画外框**；选中项聚焦时底色不变 |

> 菜单行不要加 `outline` 焦点框：点击后浏览器可能命中 `:focus-visible`，整行会套一圈蓝框，
> 看起来像多了一层边框（这是实际踩过的坑）。同理也不要给菜单行加 `background` / `color` 过渡，
> 否则自动化采样会读到过渡中间值。

一级与二级高度统一为 40px，图标尺寸 16px（箭头 11px），与父级标题左对齐基准为 46px（20px 内边距 + 16px 图标 + 10px 间距）。

菜单就是 `index.html` 里的一段 HTML，没有配置文件。新增分组只需追加一个 `.menu-group`：

```html
<div class="menu-group collapsed">
  <button class="menu-parent" data-group>
    <span class="mi"><i class="fa-solid fa-chart-line"></i></span>
    <span class="mt">报表</span>
    <span class="chev"><i class="fa-solid fa-chevron-down"></i></span>
  </button>
  <div class="menu-children">
    <a class="menu-item" href="pages/report.html" data-view="report">统计报表</a>
  </div>
</div>
```

`tenon.accordion.js` 启动时扫描这段 HTML 建索引（`Tenon.menuMap`：id → 标题 / 分组 / 地址），
页签标题与面包屑都从这里取。菜单项是**真链接**，中键或新窗口能直接打开片段。

当前使用的图标：

| 分组 | Font Awesome 类名 | 图形 |
|---|---|---|
| 仪表盘 | `fa-gauge-high` | 仪表盘 |
| 数据管理 | `fa-table-columns` | 表格（带首列） |
| 典型页面 | `fa-file-lines` | 文档 |
| 交互组件 | `fa-table-cells-large` | 四宫格 |
| 组件库 | `fa-layer-group` | 图层堆叠 |
| 流程 | `fa-diagram-project` | 流程图节点 |

图标名可在 [fontawesome.com/icons](https://fontawesome.com/icons) 搜索，免费版只提供 Solid 与部分 Regular，
所以统一用 `fa-solid`。换成别的图标只需改 `menu.js` 里对应的一行，`base.css` 无需改动
（`.menu-parent .mi i` 已统一设好宽高与字号）。

> 图标字体放在 `assets/vendor/fontawesome/`（约 300KB），**不依赖外网 CDN**，离线可用。
> 升级或替换方式见该目录下的 `NOTICE.md`；许可为 图标 CC BY 4.0 / 字体 SIL OFL 1.1 / 代码 MIT。

## 典型页面

对标 [jui.org](http://jui.org/) 「典型页面」分组，10 个页面覆盖后台最常见的信息组织方式：

| 页面 | 关键结构 | 交互要点 |
|---|---|---|
| 查询我的客户 | 左侧分类面板 + 查询条 + 表格 | 分类计数、关键字/状态过滤、分页、全选、增删改走 框架响应协议 |
| 表单查询页面 | 多条件查询条 + 结果表 | 「更多条件」展开收起、日期区间、本页合计、详情弹窗 |
| 表单录入页面 | 双列分组表单 | 必填校验 + `closeCurrent` 关闭并刷新列表 |
| 有文本输入的表单 | 多个 textarea | 字数统计联动、maxlength 截断、只读文本域 |
| 有提示的表单输入 | 页内「页面一 / 页面二」选项卡 | 字段下方提示、帮助图标 tooltip、校验状态文案 |
| 选项卡和图形 | 选项卡 → 换图表 | 折线 / 饼图 / 柱状随选项卡切换 |
| 选项卡切换图形 | 选项卡 + 类型切换按钮 | 数据维度 × 图形类型两个正交状态组合渲染 |
| 左右两个互动 | 双列表 + 中间移动按钮 | 勾选、全选、批量移动、已选标签、清空 |
| 列表输入 | 行内编辑表格 | 数量×单价自动算金额与合计，输入时不重渲染以保留光标 |
| 双层栏目列表 | 一级栏目 / 二级栏目 / 内容三栏 | 切换一级自动定位到其第一个二级栏目 |

**实现要点**：状态放在模块级变量（如 `const mc = { cat, kw, page }`），交互后调用
`Tenon.navtab.refresh(id)` 重渲染 —— 这样 `render()` 保持幂等，也顺带验证了刷新链路。
唯一的例外是行内输入与勾选：只改 state + 局部更新 DOM，避免刷新导致输入框失焦。

## 组件库

一级菜单「组件库」按 Ant Design 组件总览的七个分类组织，每个分类一个页面，页面内再按组件分节：

| 分类 | 组件（共 55 个） |
|---|---|
| 通用 | Button、Icon、Typography、FloatButton |
| 布局 | Divider、Flex、Grid、Layout、Space、Splitter |
| 导航 | Anchor、Breadcrumb、Dropdown、Menu、Pagination、Steps、Tabs |
| 数据录入 | Form、Input、InputNumber、Select、Checkbox、Radio、Switch、Slider、Rate、Upload |
| 数据展示 | Avatar、Badge、Calendar、Card、Carousel、Collapse、Descriptions、Empty、List、QRCode、Segmented、Statistic、Table、Tag、Timeline、Tooltip |
| 反馈 | Alert、Message、Modal、Drawer、Notification、Popconfirm、Progress、Result、Skeleton、Spin |
| 其他 | Affix、Watermark |

每个分类页的骨架：

```
.api-page
├── .api-nav                   # 左侧组件锚点（sticky，滚动时自动高亮当前组件）
└── .api-body
    ├── .api-hero              # 分类标题 + 说明 + 组件标签
    └── .api-sec × N          # 每个组件一节：.api-title / .api-desc / .api-demo / .api-src-wrap
```

文档页共用一套 `init()`：锚点平滑滚动 + scrollspy、页内页签、折叠面板、分段控制器、开关、
评分、下拉菜单、Message/Modal/Confirm、表格全选、示例代码展开/复制。组件样式优先复用 `components.css` 的既有类
（`.btn` `.input` `.table` `.tag` `.alert` `.tabs` `.steps` `.pager` `.tree` `.switch`），
仅对缺失组件在 `antd.css` 里以 `.a-` 前缀补充。

### 示例代码

55 个组件每个 demo 下方都有一条「查看代码」栏，展开后显示该示例的 HTML，右上角可一键复制：

```
┌────────────────────────────────────────────┐
│ </> 查看代码 ▾                        ⧉ 复制 │
├────────────────────────────────────────────┤
│ <!-- 按钮类型 -->                           │
│ <button class="btn btn-primary">主要按钮</button> │
│ <button class="btn btn-default">默认按钮</button> │
│ …                                          │
└────────────────────────────────────────────┘
```

**代码不是手写的，是把 demo 渲染后的 DOM 序列化回来的。** 因此永远不会出现「文档写的是一套、
实际渲染是另一套」的漂移，新增组件也不用额外维护一份代码字符串。

序列化在 `sectionHtml()` 里同步完成（用一个游离的 `div` 承接 `innerHTML` 再遍历），
所以 `render()` 保持纯函数 + 幂等，`Tenon.navtab.refresh()` 之后代码块依然在。

还原过程中做了四件事，都在 `antd.js` 的 `demoCode()` 里：

| 处理 | 规则 |
|---|---|
| 拆脚手架 | `.api-block` / `.api-row` 是纯排版容器，不进示例（直接解包，子节点上提一级） |
| 标题转注释 | `.api-label`、`.api-code` 的文案变成 `<!-- 按钮类型 -->`，保留信息又不污染结构 |
| 折叠 svg | 内联 `<svg>` 折成 `<!-- svg -->`，否则一个图标示例能刷出几百行路径 |
| 空值属性 | `disabled=""` / `data-a-switch=""` 输出为裸属性 `disabled`、`data-a-switch` |

折行判定按**结构**而不是长度：只有「文本 / 注释 / svg / 只装 svg 的包装元素（`.a-icon`）/
空壳元素（`.switch-dot`）」可以留在同一行，其余一律换行缩进。
这样同类节点行为一致——时间线的 4 个 `<li>` 要么全单行要么全多行，不会一半一行一半三行
（一开始用长度阈值就踩了这个坑）。

示例里的提示语（「点击按钮查看效果」这类）不属于组件代码，在源码上标 `data-no-code` 即可排除，
属性本身也不会出现在输出里：

```html
<span class="tiny muted" data-no-code>点击按钮查看效果</span>
```

复制取的是 `<pre>` 的 `textContent` —— 高亮只加 `<span class="tok-*">` 标签、不改文本，
所以拿到的就是原始代码，不需要另存一份。剪贴板 API 不可用（非 https / 老浏览器）时
退化为选中文本 + 提示按 `Ctrl+C`。

着色是二十来行的正则高亮，四类 token：注释 `.tok-com`、标签名 `.tok-tag`、
属性名 `.tok-attr`、属性值 `.tok-str`。先 `esc()` 转义再按 `&lt;` / `&quot;` 匹配，
所以不会和真实的 HTML 标签混淆。

> 写文档页时踩过一个坑：`.a-progress-bar` 用 `<span>` 承载时 `height:100%` 不生效（inline 元素），
> 导致进度条只剩灰色轨道。凡是靠宽高撑开的装饰元素，都要显式 `display: block`。

## 主题设置

顶栏右上角齿轮按钮打开「主题设置」抽屉，提供 9 个预设色（拂晓蓝 / 极客蓝 / 酱紫 / 法式洋红 / 火山 / 日暮 / 明青 / 极光绿 / 石墨黑）与任意自定义取色。

切换时由 `tenon.theme.js` 计算并写入 `<html>` 上的 CSS 变量，所有组件与 SVG 图表实时生效：

| 变量 | 派生规则 | 用途 |
|---|---|---|
| `--primary` | 主题色本体 | 主按钮、选中态、图表主色 |
| `--primary-hover` | 与白色混合 28% | 悬停 |
| `--primary-active` | 与黑色混合 18% | 按下 |
| `--primary-bg` | 与白色混合 92% | 菜单选中底色、浅色标签 |
| `--primary-border` | 与白色混合 62% | 浅色描边 |

- 选择结果写入 `localStorage["web-admin:primary"]`，刷新后保持；
- 图表的主色用 `currentColor` 绘制，切主题**不需要重绘页面**，颜色自动跟随；
- 修改默认色：同步调整 `tokens.css` 的 `--primary` 与 `tenon.theme.js` 的 `DEFAULT`。

## 与 dwz_jui 的对应关系

改造后与 dwz_jui 的组织方式基本一一对应（路径均已含 `../../src/` 前缀）：

| dwz_jui | 本项目 |
|---|---|
| `index.html` + `dwz.frag.xml` 片段 | `index.html` + `pages/*.html` 片段（fetch 加载，不是一个 XML 打包） |
| `js/dwz.core.js`（命名空间 / DOM 工具 / 注册表） | `../../src/core/tenon.core.js` + `tenon.dom.js` + `tenon.registry.js`（一拆为三） |
| `js/dwz.ajax.js` | `../../src/shell/tenon.ajax.js`（片段加载 + 协议处理） |
| `js/dwz.navTab.js` | `../../src/shell/tenon.navtab.js`（含首页常驻 + 右键菜单 + ⋮ 全部标签） |
| `dwz.frag.xml` 里的菜单树 | `index.html` 里的静态 `.menu-group` / `.menu-item` |
| `js/dwz.dialog.js` / `dwz.alertMsg.js` | `../../src/ui/tenon.dialog.js` + `../../src/ui/tenon.ui.js` |
| `js/dwz.validate.js` | `../../src/ui/tenon.form.js`（`data-rule` 声明式校验） |
| `js/dwz.ui.js` 里的 table/pagination | `../../src/ui/tenon.table.js`（排序 / 分页 / 全选 / 过滤） |
| `js/dwz.accordion.js` | `../../src/shell/tenon.accordion.js`（折叠 + 飞出层 + 高亮） |
| `css/` + `themes/` | `assets/css/tokens.css` + `base.css` + `components.css` |
| 典型页面示例（demo_page*） | `pages/*.html` 的 30 个片段 |
| 后端返回 `{statusCode, message, navTabId, callbackType}` | 协议完全保留 |
| 登录拦截（会话 / `login.html`） | `../../src/shell/tenon.auth.js` + `login.html` |

四处差异，都是刻意的：

1. **片段用 `fetch` 而不是 XML 包裹**，一个页面一个文件，改哪页看哪页；
2. **控件靠 `tn-data` 声明**，不再用 class 组合式——扫描器只认属性，换皮肤时类名可以整体替换；
3. **皮肤抽到 kit 层**（`tenon.kit.js` + `tenon.kit.antd.js`），控件与外壳里一个类名都没有，
   要换 UI 就写一个新的 `tenon.kit.<名字>.js` 换掉那一行 `<script>`；
4. **命名空间只剩 `Tenon`**，`DWZ` 别名已在 v2.0 移除，
   `data-dwz` / `dwz:*` / `el.__dwz` 全部改为 `tn-data` / `tenon:*` / `el.__tn`。

## 已验证页面

共 **30 个页面**全部通过无头浏览器验证（逐页打开 + 控件初始化 + 关键交互断言，0 报错）：

- 仪表盘：工作台（欢迎区/指标卡/项目进度/快捷操作/时间线）、分析页（柱状/折线/饼图）
- 数据管理：用户管理（排序/分页/批量删除/弹窗编辑）、客户查询（条件过滤 + 分页）
- 典型页面：查询我的客户、表单查询、表单录入、文本表单、带提示表单、选项卡和图形、
  选项卡切换图形、左右互动、列表输入、双层栏目列表
- 交互组件：选项卡面板、弹窗（基础/表单/确认/删除/嵌套）、提示、树形菜单
- 组件库：通用(4)、布局(6)、导航(7)、数据录入(10)、数据展示(16)、反馈(10)、其他(2)
- **框架能力**：下拉选择（单选/多选+搜索）、级联选择、文件选择（拖拽/限制/可删）、虚拟滚动 1000 行、固定表头、固定列
- 流程：待办任务、新建流程（向导）、我的流程
- 账号：个人中心（信息卡 + 安全设置，由账号下拉进入，不在侧边栏）

架构改造本身的实测断言：

| 用例 | 结果 |
|---|---|
| 30 个片段能否被 fetch 并插入 | 全部 OK，无「加载失败」块 |
| 页面脚本是否按 `data-script` 懒加载 | 17 个脚本全部命中，无 404 |
| 组件是否被扫描初始化 | 30 页全部初始化，antd-display 单页最多 20 个 |
| 表格排序 | 点「年龄」后首行 32 → 22（升序生效） |
| 表格列宽 | 拖列头右缘的把手可改列宽，松手后 `colgroup` 记住新宽度 |
| 语言切换 | 顶栏 EN/中 按钮：框架文案 + 菜单 + 页签 + 面包屑一起换，刷新后保持 |
| 表格分页 | 15 条 / 8 条一页 → 第 1 页 8 行、第 2 页 7 行 |
| 条件过滤 | 客户查询输入「张伟」：10 行 → 3 行，计数同步为「共 3 条」 |
| 树联动 | 点箭头后子节点展开；点「技术中心」详情随之切换 |
| 选项卡 | 点「参数配置」后面板从 info 切到 param |
| 表单校验 | 空提交产生 3 处 `.is-error`，首条提示「请输入客户名称」 |
| 示例代码 | 「通用」页 4 个代码块，展开后按钮变「收起代码」，代码 968 字符且无裸 `<svg>` |
| 图表切换 | 切到饼图后 SVG 的 aria-label 从「柱状图」变「饼图」 |
| 菜单索引 | `Tenon.menuMap` 收录 29 项，含首页 |

此外登录页 `login.html` 与下列流程均已实测：

| 用例 | 期望 |
|---|---|
| 未登录直接访问 `index.html` | 落到 `login.html`，后台骨架不出现 |
| 提交空用户名 | 原地报错「请输入用户名」，不跳转 |
| 正常提交（记住我 ✓） | 跳到 `index.html`，名称显示为输入值，头像为首字母大写 |
| 退出登录 | 确认后回到 `login.html`，`localStorage` / `sessionStorage` 均已清空 |
| 首页关闭 | `×` 不存在；`close("dashboard")` 无效；`closeAll()` 后剩 `["工作台"]` 且激活 |
| 首页右键 | `refresh: 可选`、`close: 置灰`、`关闭其它: 置灰`、`关闭全部: 可选` |
| 账号菜单 | 三项 + 分隔线，行高 38px，右边缘与触发器对齐，头像在左名称在右 |

功能项：页签右键操作（4 项 + R/W 快捷键）、首页常驻不可关闭、`⋮` 全部标签页、
页签横向翻页箭头（无滚动条）、侧边栏折叠（含折叠态飞出层）、面包屑（分组 / 当前页）、
账号下拉（个人中心 / 个人设置 / 退出登录）、登录守卫与退出跳转、
组件库 55 个示例的代码展开与复制（DOM 序列化生成、HTML 高亮）、
主题色切换（9 预设 + 任意取色）、框架响应协议（`closeCurrent` / `refreshCurrent` / `navTabId`）。

### 可复跑：`e2e.html`

上表是一次性的手工验证，后面把它固化成了可复跑的脚本：

```bash
cd <项目根>
python -m http.server 8123
# 浏览器打开 http://127.0.0.1:8123/examples/web-admin/e2e.html
```

页面用同源 iframe 载入 `index.html`，前半段驱真实交互（页签开关/刷新/右键/⋮/关闭其它、
面包屑、分组高亮、侧栏收起与飞出层、主题抽屉、各浮层的 Esc 与点外面），后半段把 30 个页面依次打开并检查
`data-page`、空态块与运行期报错。结果写 `window.__e2e = { total, pass, fail, errs }`，
无头模式可以直接抓：

```bash
msedge --headless=new --virtual-time-budget=150000 --dump-dom \
  http://127.0.0.1:8123/examples/web-admin/e2e.html | grep -o '通过.*失败'
```

最新一次结果：**64 项全通过，30 页零报错**；另有 `e2e-login.html` **11 项全通过**。

> 与 `../../src/selftest.html` 的分工：那边测框架自身（56 条，不引任何 CSS），
> 这边测「框架 + 这套皮肤 + 这套外壳」合起来的表现。
