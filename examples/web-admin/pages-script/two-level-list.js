/* ===========================================================
   pages-script/two-level-list.js — 双层栏目列表
   -----------------------------------------------------------
   一级 / 二级 / 内容三列都是页面里的静态节点，
   脚本只维护 cat + sub 两个状态：切一级时强制回到它的第一个子栏目，
   重绘范围限定在二级列 + 内容列 + 底部“当前路径”。
   =========================================================== */
Tenon.page.define("two-level-list", function (root) {
  const { qs, qsa, esc } = Tenon.core;

  /* 一级栏目（各 2 个二级）原样搬自 views/demo-pages.js */
  const CATS = [
    { id: "product", name: "产品中心", children: [{ id: "hw", name: "硬件产品" }, { id: "sw", name: "软件产品" }] },
    { id: "solution", name: "解决方案", children: [{ id: "fin", name: "金融方案" }, { id: "edu", name: "教育方案" }] },
    { id: "service", name: "客户服务", children: [{ id: "faq", name: "常见问题" }, { id: "doc", name: "使用文档" }] }
  ];

  /* 文档按二级 id 分组，原样搬自 views/demo-pages.js */
  const DOCS = {
    hw: [
      { title: "智能终端 T1 发布说明", author: "张伟", date: "2026-11-18", tag: "新品" },
      { title: "边缘网关 G2 硬件规格", author: "刘洋", date: "2026-11-12", tag: "规格" },
      { title: "工控机散热方案对比", author: "吴敏", date: "2026-11-05", tag: "技术" }
    ],
    sw: [
      { title: "数据中台 v3.2 升级指南", author: "李娜", date: "2026-11-17", tag: "升级" },
      { title: "移动端 SDK 接入文档", author: "周涛", date: "2026-11-09", tag: "文档" }
    ],
    fin: [
      { title: "银行核心系统迁移实践", author: "王强", date: "2026-11-16", tag: "案例" },
      { title: "风控模型实时化方案", author: "赵磊", date: "2026-11-03", tag: "方案" }
    ],
    edu: [{ title: "智慧校园整体架构", author: "孙倩", date: "2026-11-11", tag: "方案" }],
    faq: [
      { title: "如何重置管理员密码", author: "客服中心", date: "2026-11-15", tag: "FAQ" },
      { title: "接口调用频率限制说明", author: "客服中心", date: "2026-11-08", tag: "FAQ" }
    ],
    doc: [{ title: "快速上手（5 分钟）", author: "文档组", date: "2026-11-14", tag: "文档" }]
  };

  let cat = "product";
  let sub = "hw";

  /* 三列固定顺序：一级 / 二级 / 内容 */
  const cols = qsa(".cols-panel > .col", root);
  const catCol = cols[0] || null;
  const subCol = cols[1] || null;
  const docCol = cols[2] || null;
  const pathEl = qs("p.tiny.muted", root);

  function docHtml(d) {
    return `<div class="doc-item" data-tl-doc="${esc(d.title)}">
                  <div class="doc-item-title">${esc(d.title)}</div>
                  <div class="doc-item-meta">
                    <span>${esc(d.author)}</span><span>${esc(d.date)}</span>
                    <span class="tag tag-blue" style="height:18px;font-size:11px">${esc(d.tag)}</span>
                  </div>
                </div>`;
  }

  /* 一级只切 active；二级列与内容列整列重建；底部路径跟着改 */
  function paint() {
    const curCat = CATS.find((c) => c.id === cat) || CATS[0];
    const docs = DOCS[sub] || [];
    const curSub = curCat.children.find((s) => s.id === sub);

    if (catCol) {
      qsa("[data-tl-cat]", catCol).forEach((item) => {
        item.classList.toggle("active", item.dataset.tlCat === curCat.id);
      });
    }

    if (subCol) {
      subCol.innerHTML = `<div class="col-head">二级栏目</div>`
        + curCat.children.map((s) => `<div class="col-item ${s.id === sub ? "active" : ""}" data-tl-sub="${s.id}">
                  <span>${esc(s.name)}</span><span class="count">${(DOCS[s.id] || []).length}</span></div>`).join("");
    }

    if (docCol) {
      docCol.innerHTML = `<div class="col-head">内容列表 · ${docs.length} 条</div>`
        + (docs.length
          ? docs.map(docHtml).join("")
          : `<div class="transfer-empty">该栏目下暂无内容</div>`);
    }

    if (pathEl) pathEl.textContent = `当前路径：${curCat.name} / ${curSub ? curSub.name : "—"}`;
  }

  paint();

  /* 切一级：二级强制落到该一级的第一个子栏目 */
  Tenon.core.on(root, "click", "[data-tl-cat]", (e, item) => {
    const next = CATS.find((c) => c.id === item.dataset.tlCat);
    if (!next) return;
    cat = next.id;
    sub = next.children[0].id;
    paint();
  });

  /* 切二级：做归属校验，不属于当前一级的子栏目直接忽略 */
  Tenon.core.on(root, "click", "[data-tl-sub]", (e, item) => {
    const curCat = CATS.find((c) => c.id === cat) || CATS[0];
    const next = curCat.children.find((s) => s.id === item.dataset.tlSub);
    if (!next) return;
    sub = next.id;
    paint();
  });

  Tenon.core.on(root, "click", "[data-tl-doc]", (e, item) => {
    Tenon.ui.modal({
      title: item.dataset.tlDoc,
      width: 560,
      hideCancel: true,
      body: `<p>这是「双层栏目列表」右侧内容区的详情示例。</p>
        <p class="muted" style="margin-top:8px">实际项目中此处可加载正文、附件与评论。</p>`
    });
  });
});
