# 最简起步

四个文件跑起来一个后台：外壳 + 一份 CSS + 两个页面片段。

```
examples/minimal/
├── index.html      外壳：菜单 / 页签 / 面包屑 / 工作区
├── skin.css        全部外观（属性选择器，没有一个类名）
└── pages/
    ├── hello.html  一个纯内容页
    └── table.html  带表格（排序 / 分页 / 勾选 / 列宽拖拽）
```

## 怎么跑

页面片段是用 `fetch` 取的，所以要起一个静态服务（双击文件不行）：

```bash
cd <项目根>
python -m http.server 8123
# 打开 http://127.0.0.1:8123/examples/minimal/
```

## 它演示了什么

1. **一句 `<script>` 引框架** —— 用的是 `src/tenon.all.min.js`（单文件版）
2. **页面只有 HTML** —— 两个片段里没有一行 JS，排序、分页、勾选、列宽全是 `data-*` 声明的
3. **外观只有一份 CSS** —— 全文没有 `.class` 选择器；搜「.」只会命中注释里的句号
4. **启动三行** —— `accordion.init()` → `navtab.init()` → `navtab.start()`，
   没有 boot 文件，外壳怎么装配是你的事

## 两个刻意的选择

**为什么 `Tenon.kit.reset()`**

`tenon.all.min.js` 里打包了 antd 皮肤（`tenon.kit.antd.js`），它在加载时会把自己设成当前套件。
这个示例想演示「裸套件 + 一份小 CSS」的路线，所以先切回 `plain`。

想用 antd 皮肤：删掉 `reset()` 那一行，再引 `examples/web-admin/assets/css/` 里的那几份 CSS。

**为什么不是 10 行**

外壳本身（菜单、页签条、面包屑、工作区）必须写在 HTML 里 —— 这是框架的取舍：
**菜单就是 HTML，改菜单就是改这段 HTML**，不引入菜单配置文件。
`index.html` 里真正属于「框架」的只有三个 id（`#menu` `#tabbar` `#workarea`）和两个属性
（`data-home` `data-sync`）。

## 接着往下走

| 想做的事 | 看哪里 |
|---|---|
| 加页面 | 在 `pages/` 放片段，在 `index.html` 菜单里加一行 `<a data-view="…">` |
| 加交互 | 片段根上写 `data-script="名字"`，建 `pages-script/名字.js` 用 `Tenon.page.define` |
| 换长相 | 改 `skin.css`；想连结构一起换，见 `src/showcase/`（零类名实证） |
| 控件怎么用 | 见 `src/README.md`；完整示例在 `examples/web-admin/`（30 个页面） |
