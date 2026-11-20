/* ===========================================================
   纯 SVG 图表 — 柱状 / 折线 / 饼图（跟随主题色）
   =========================================================== */
Tenon.chart = (function () {
  function primaryColor() {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    return value || "#1677ff";
  }

  function bar(data, color) {
    const c = color || primaryColor();
    const W = 520, H = 210, P = 34;
    const boxW = W - P * 2, gap = boxW / data.length, bw = gap * 0.5;
    const max = Math.max(...data.map((d) => d.v)) * 1.15;
    let bars = "";
    data.forEach((d, i) => {
      const h = (H - P * 2) * d.v / max;
      const x = P + i * gap + (gap - bw) / 2;
      const y = H - P - h;
      bars += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" fill="${c}" opacity="${0.55 + 0.45 * (i + 1) / data.length}"></rect>
        <text x="${x + bw / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="#595959">${d.v}</text>
        <text x="${x + bw / 2}" y="${H - P + 18}" text-anchor="middle" font-size="11" fill="#8c8c8c">${d.k}</text>`;
    });
    let grid = "";
    for (let i = 0; i <= 3; i++) {
      const y = P + (H - P * 2) * i / 3;
      grid += `<line x1="${P}" x2="${W - P}" y1="${y}" y2="${y}" stroke="#f0f0f0"/>`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${Tenon.i18n.t("chart.bar")}">${grid}${bars}</svg>`;
  }

  function line(data) {
    const c = primaryColor();
    const W = 520, H = 210, P = 34;
    const boxW = W - P * 2, step = boxW / (data.length - 1);
    const max = Math.max(...data.map((d) => d.v)) * 1.15;
    const pts = data.map((d, i) => [P + i * step, H - P - (H - P * 2) * d.v / max]);
    const poly = pts.map((p) => p.join(",")).join(" ");
    const area = `${P},${H - P} ${poly} ${P + boxW},${H - P}`;
    let dots = "", labels = "";
    pts.forEach((p, i) => {
      dots += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#fff" stroke="${c}" stroke-width="2"/>`;
      labels += `<text x="${p[0]}" y="${H - P + 18}" text-anchor="middle" font-size="11" fill="#8c8c8c">${data[i].k}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${Tenon.i18n.t("chart.line")}">
      <polygon points="${area}" fill="${c}" opacity="0.06"/>
      <polyline points="${poly}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>
      ${dots}${labels}</svg>`;
  }

  function pie(data) {
    const W = 520, H = 230, cx = 170, cy = H / 2, r = 82;
    const colors = [primaryColor(), "#52c41a", "#faad14", "#ff4d4f", "#722ed1"];
    const total = data.reduce((s, d) => s + d.v, 0);
    let a0 = -Math.PI / 2, paths = "";
    data.forEach((d, i) => {
      const a1 = a0 + Math.PI * 2 * d.v / total;
      const at = (a) => [(cx + r * Math.cos(a)).toFixed(2), (cy + r * Math.sin(a)).toFixed(2)];
      const [x0, y0] = at(a0), [x1, y1] = at(a1);
      paths += `<path d="M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1} Z" fill="${colors[i % 5]}" opacity="0.9"/>`;
      a0 = a1;
    });
    let legend = "";
    data.forEach((d, i) => {
      legend += `<g transform="translate(320,${64 + i * 30})">
        <rect width="10" height="10" rx="2" fill="${colors[i % 5]}"/>
        <text x="18" y="9" font-size="12" fill="#595959">${d.k}</text>
        <text x="150" y="9" font-size="12" fill="#8c8c8c" text-anchor="end">${d.v}</text></g>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${Tenon.i18n.t("chart.pie")}">${paths}${legend}</svg>`;
  }

  return { bar, line, pie };
})();
