#!/usr/bin/env node
/* ===========================================================
   tools/test.js — 一把跑完全部回归
   -----------------------------------------------------------
   用法：
     node tools/test.js                跑全部
     node tools/test.js selftest e2e   只跑名字里含这些词的
     node tools/test.js --verbose      失败时把断言原文也打出来

   为什么要有它：各套用例的命令都带一长串 headless 参数，记不住也容易敲错；
   而「跑没跑全」比「跑没跑过」更容易出问题。

   实现上不做任何打包：直接起 headless 浏览器打开那个 HTML，
   从 dump 出来的 DOM 里读「共 N 项 通过 P 失败 F」那一行。
   =========================================================== */
"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

/* 每套用例：相对路径 + 虚拟时间预算（毫秒）+ 说明 */
const SUITES = [
  { key: "selftest", file: "src/selftest.html", budget: 9000, note: "框架自检（逐个模块）" },
  { key: "bundle", file: "src/selftest.bundle.html", budget: 9000, note: "同一套断言跑 tenon.all.js" },
  { key: "bundle-min", file: "src/selftest.bundle.html?min", budget: 9000, note: "同一套断言跑 tenon.all.min.js" },
  { key: "e2e", file: "examples/web-admin/e2e.html", budget: 170000, note: "antd 皮肤 + 外壳 + 30 页全量" },
  { key: "login", file: "examples/web-admin/e2e-login.html", budget: 40000, note: "登录 / 退出 / 记住我" },
  { key: "showcase", file: "src/showcase/e2e.html", budget: 80000, note: "换肤实证（零类名）" }
];

const argv = process.argv.slice(2);
const verbose = argv.includes("--verbose");
const filters = argv.filter((a) => !a.startsWith("--"));

/* ---------------- 找浏览器 ---------------- */

function findBrowser() {
  if (process.env.TENON_BROWSER && fs.existsSync(process.env.TENON_BROWSER)) {
    return process.env.TENON_BROWSER;
  }
  const candidates = [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/microsoft-edge"
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

/* ---------------- 解析结果 ---------------- */

function textOf(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ");
}

function parse(html) {
  const flat = textOf(html).replace(/\s+/g, " ");
  const m = flat.match(/共\s*(\d+)\s*项[：:]?\s*通过\s*(\d+)\s*[·\s]\s*失败\s*(\d+)/);
  if (!m) return null;

  const fails = [];
  const li = /<li class="no">([\s\S]*?)<\/li>/gi;
  let hit;
  while ((hit = li.exec(html))) {
    fails.push(textOf(hit[1]).replace(/\s+/g, " ").trim().replace(/^FAIL\s*/, ""));
  }
  const pre = html.match(/<pre id="log">([\s\S]*?)<\/pre>/i);
  if (pre) {
    textOf(pre[1]).split("\n").forEach((line) => {
      const s = line.trim();
      if (s.startsWith("FAIL")) fails.push(s.replace(/^FAIL\s*/, ""));
    });
  }
  return { total: +m[1], pass: +m[2], fail: +m[3], fails };
}

/* ---------------- 跑一套 ---------------- */

const browser = findBrowser();
if (!browser) {
  console.error("没找到浏览器。装 Edge/Chrome，或用 TENON_BROWSER=<路径> 指定。");
  process.exit(2);
}

const picked = SUITES.filter((s) => !filters.length || filters.some((f) => s.key.includes(f)));
if (!picked.length) {
  console.error("没有匹配的套件：" + filters.join(" ") + "\n可选：" + SUITES.map((s) => s.key).join(" "));
  process.exit(2);
}

const results = [];

picked.forEach((suite) => {
  const url = "file:///" + path.join(ROOT, suite.file).replace(/\\/g, "/");
  process.stdout.write("跑 " + suite.key.padEnd(12) + " (" + suite.note + ") … ");

  let html = "";
  try {
    html = execFileSync(browser, [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--allow-file-access-from-files",   // 片段是 fetch 取的，file:// 下必须开
      "--window-size=1440,900",
      "--virtual-time-budget=" + suite.budget,
      "--dump-dom",
      url
    ], { maxBuffer: 64 * 1024 * 1024, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) {
    console.log("启动失败");
    results.push({ ...suite, ok: false, total: 0, pass: 0, fail: 0, fails: ["浏览器进程异常：" + e.message] });
    return;
  }

  const r = parse(html);
  if (!r) {
    console.log("结果解析失败");
    results.push({ ...suite, ok: false, total: 0, pass: 0, fail: 0, fails: ["没读到「共 N 项」汇总，可能页面没跑起来"] });
    return;
  }

  const ok = r.fail === 0 && r.pass === r.total && r.total > 0;
  console.log((ok ? "✓" : "✗") + " " + r.pass + "/" + r.total);
  results.push({ ...suite, ok, ...r });
});

/* ---------------- 汇总 ---------------- */

const failed = results.filter((r) => !r.ok);
const sum = (k) => results.reduce((n, r) => n + (r[k] || 0), 0);

console.log("");
console.log("─".repeat(58));
results.forEach((r) => {
  console.log("  " + (r.ok ? "✓" : "✗") + " " + r.key.padEnd(12) + String(r.pass).padStart(3) + "/" + String(r.total).padEnd(4) + " " + r.note);
});
console.log("─".repeat(58));
console.log("合计 " + sum("pass") + "/" + sum("total") + " 项" + (failed.length ? "，失败 " + sum("fail") + " 项" : "，全绿"));

if (failed.length && verbose) {
  console.log("");
  failed.forEach((r) => {
    console.log("【" + r.key + "】");
    r.fails.forEach((f) => console.log("  - " + f));
  });
} else if (failed.length) {
  console.log("（加 --verbose 可看每条失败原因）");
}

process.exit(failed.length ? 1 : 0);
