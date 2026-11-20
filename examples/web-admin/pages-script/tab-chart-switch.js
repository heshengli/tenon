/* ===========================================================
   pages-script/tab-chart-switch.js — 选项卡 + 图形类型（两个正交维度）
   -----------------------------------------------------------
   维度（week/month/year）与类型（bar/line/pie）互不影响，
   脚本只维护这两份状态，然后就地重画 SVG、合计与类型文案；
   按钮的选中态、图表容器全部复用页面里已有的节点。
   =========================================================== */
Tenon.page.define("tab-chart-switch", function (root) {
  const { qs, qsa } = Tenon.core;

  /* 三组数据原样搬自 views/demo-pages.js，数值未改 */
  const TCS_DATA = {
    week: [{ k: "周一", v: 12 }, { k: "周二", v: 19 }, { k: "周三", v: 15 }, { k: "周四", v: 24 }, { k: "周五", v: 31 }],
    month: [{ k: "第1周", v: 62 }, { k: "第2周", v: 78 }, { k: "第3周", v: 55 }, { k: "第4周", v: 91 }],
    year: [{ k: "Q1", v: 210 }, { k: "Q2", v: 268 }, { k: "Q3", v: 245 }, { k: "Q4", v: 302 }]
  };

  const KIND_TEXT = { bar: "柱状图", line: "折线图", pie: "饼图" };

  let dim = "week";
  let kind = "bar";

  const bd = qs(".card-bd", root);
  const chartBox = bd ? qs("div[style*='max-width']", bd) : null;
  const totalEl = bd ? qs(".toolbar b", bd) : null;
  const typeEl = bd ? qs(".toolbar .tag", bd) : null;

  /* 就地重画：维度页签 / 类型按钮 / SVG / 合计 / 类型标签 */
  function paint() {
    const data = TCS_DATA[dim] || TCS_DATA.week;
    const svg = kind === "line" ? Tenon.chart.line(data)
      : kind === "pie" ? Tenon.chart.pie(data)
        : Tenon.chart.bar(data);

    /* 维度用的是 .tab-item 的 active 态 */
    qsa("[data-tcdim]", root).forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tcdim === dim);
    });

    /* 类型用的是 btn-primary / btn-default */
    qsa("[data-tckind]", root).forEach((btn) => {
      const on = btn.dataset.tckind === kind;
      btn.classList.toggle("btn-primary", on);
      btn.classList.toggle("btn-default", !on);
    });

    if (chartBox) chartBox.innerHTML = svg;
    if (totalEl) totalEl.textContent = data.reduce((s, d) => s + d.v, 0).toLocaleString();
    if (typeEl) typeEl.textContent = KIND_TEXT[kind] || "";
  }

  paint();

  Tenon.core.on(root, "click", "[data-tcdim]", (e, btn) => {
    dim = btn.dataset.tcdim;
    paint();
  });

  Tenon.core.on(root, "click", "[data-tckind]", (e, btn) => {
    kind = btn.dataset.tckind;
    paint();
  });
});
