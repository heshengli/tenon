/* ===========================================================
   pages-script/tab-chart.js — 选项卡 + 图形
   -----------------------------------------------------------
   选项卡按钮、标题/说明、图表容器、“图表类型”卡片都是静态标记，
   切换时由 tenon.chart 重画 SVG，脚本只做「就地换图 + 换文案」，
   不整页重绘，页签状态与滚动位置都不会丢。
   =========================================================== */
Tenon.page.define("tab-chart", function (root) {
  const { qs, qsa } = Tenon.core;

  /* 三组数据原样搬自 views/demo-pages.js，数值未改 */
  const TC_DATA = {
    trend: {
      title: "月度签约趋势",
      desc: "近 6 个月签约金额（万元）",
      kind: "line",
      data: [{ k: "6月", v: 42 }, { k: "7月", v: 58 }, { k: "8月", v: 51 },
             { k: "9月", v: 74 }, { k: "10月", v: 66 }, { k: "11月", v: 88 }]
    },
    region: {
      title: "区域分布",
      desc: "各区域客户数量占比",
      kind: "pie",
      data: [{ k: "华东", v: 42 }, { k: "华南", v: 26 }, { k: "华北", v: 19 }, { k: "西部", v: 13 }]
    },
    product: {
      title: "产品线销售额",
      desc: "各产品线当月销售额（万元）",
      kind: "bar",
      data: [{ k: "CRM", v: 86 }, { k: "ERP", v: 64 }, { k: "BI", v: 47 }, { k: "OA", v: 33 }]
    }
  };

  const KIND_TEXT = { line: "折线图", pie: "饼图", bar: "柱状图" };

  let tab = "trend";

  /* 只取第一张卡里的图表区，避免命中下面 grid2 的卡片 */
  const bd = qs(".card-bd", root);
  const chartBox = bd ? qs("div[style*='max-width']", bd) : null;
  const titleEl = bd ? qs(".between b", bd) : null;
  const descEl = bd ? qs(".between > span", bd) : null;

  /* grid2 第二张卡里的“图表类型”大字 */
  const cards = qsa(".grid2 .card", root);
  const kindEl = cards.length > 1 ? qs(".card-bd > div[style*='font-size']", cards[1]) : null;

  function svgOf(cur) {
    return cur.kind === "line" ? Tenon.chart.line(cur.data)
      : cur.kind === "pie" ? Tenon.chart.pie(cur.data)
        : Tenon.chart.bar(cur.data);
  }

  /* 就地重画：选项卡 active / 图表 SVG / 标题说明 / 类型卡片 */
  function paint() {
    const cur = TC_DATA[tab] || TC_DATA.trend;

    qsa("[data-tctab]", root).forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tctab === tab);
    });

    if (chartBox) chartBox.innerHTML = svgOf(cur);
    if (titleEl) titleEl.textContent = cur.title;
    if (descEl) descEl.textContent = cur.desc;
    if (kindEl) kindEl.textContent = KIND_TEXT[cur.kind] || "";
  }

  paint();

  Tenon.core.on(root, "click", "[data-tctab]", (e, btn) => {
    tab = btn.dataset.tctab;
    paint();
  });
});
