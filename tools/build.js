#!/usr/bin/env node
/* ===========================================================
   tools/build.js — 把 src 下的框架文件打成一个 bundle
   -----------------------------------------------------------
   用法：
     node tools/build.js            生成
     node tools/build.js --check    只校验：磁盘上的产物是否与源码一致

   产出：
     src/tenon.all.js      合并版（保留注释与缩进，方便调试）
     src/tenon.all.min.js  ？只删注释与行首缩进，保留换行

   为什么自己写压缩器：这个项目没有构建链，也不打算为了打一个包去装
   terser/esbuild。这里只做两件绝对安全的事 —— 去注释、压空白，
   不改变任何 token，也不动分号与换行（ASI 依赖换行）。

   bundle 是产物，不要手改；改源码后重新跑这个脚本。
   =========================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(SRC, "tenon.all.js");
const OUT_MIN = path.join(SRC, "tenon.all.min.js");

/* 顺序即依赖顺序：core → kit → ajax → 控件 → 外壳。
   与 src/README.md 的「加载顺序」一节必须一致。 */
const FILES = [
  "core/tenon.core.js",
  "shell/tenon.theme.js",
  "shell/tenon.auth.js",
  "core/tenon.dom.js",
  "core/tenon.registry.js",
  "core/tenon.i18n.js",
  "i18n/tenon.zh-CN.js",
  "i18n/tenon.en.js",
  "ui/tenon.kit.js",
  "ui/tenon.kit.antd.js",
  "ui/tenon.ui.js",
  "shell/tenon.ajax.js",
  "ui/tenon.popover.js",
  "ui/tenon.dropdown.js",
  "ui/tenon.dialog.js",
  "ui/tenon.tabs.js",
  "ui/tenon.switch.js",
  "ui/tenon.collapse.js",
  "ui/tenon.segmented.js",
  "ui/tenon.rate.js",
  "ui/tenon.optionlist.js",
  "ui/tenon.select.js",
  "ui/tenon.cascader.js",
  "ui/tenon.upload.js",
  "ui/tenon.tree.js",
  "ui/tenon.table.js",
  "ui/tenon.form.js",
  "ui/tenon.chart.js",
  "shell/tenon.navtab.js",
  "shell/tenon.accordion.js"
];

/* ---------------- 压缩器 ---------------- */

/**
 * 去掉注释、压掉多余空白。
 * 用一个小扫描器区分「代码 / 字符串 / 模板串 / 正则 / 注释」，
 * 模板串里的 ${...} 允许嵌套（kit.antd 的模板里就套了模板）。
 */
function stripComments(code) {
  const PUNCT = "([{,;:=!&|?+-*%~^<>";
  let out = "";
  let i = 0;
  const n = code.length;

  /* 栈帧：{ kind: "code" | "tpl", depth: number, fromTpl?: boolean } */
  const stack = [{ kind: "code", depth: 0 }];
  let lastSig = "";                    // 上一个有意义的字符，用来判断 / 是除号还是正则

  const top = () => stack[stack.length - 1];

  while (i < n) {
    const c = code[i];
    const c2 = code[i + 1];
    const frame = top();

    /* ---- 模板串内部 ---- */
    if (frame.kind === "tpl") {
      if (c === "\\") { out += c + (c2 || ""); i += 2; continue; }
      if (c === "`") { out += c; i++; stack.pop(); lastSig = "`"; continue; }
      if (c === "$" && c2 === "{") {
        out += "${"; i += 2;
        stack.push({ kind: "code", depth: 0, fromTpl: true });
        lastSig = "{";
        continue;
      }
      out += c; i++; continue;
    }

    /* ---- 代码区 ---- */
    if (c === "/" && c2 === "/") {                        // 行注释
      while (i < n && code[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && c2 === "*") {                        // 块注释
      i += 2;
      while (i < n && !(code[i] === "*" && code[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") {                         // 普通字符串
      const q = c;
      out += c; i++;
      while (i < n && code[i] !== q) {
        if (code[i] === "\\") { out += code[i] + (code[i + 1] || ""); i += 2; continue; }
        out += code[i]; i++;
      }
      out += code[i] || ""; i++;
      lastSig = q;
      continue;
    }
    if (c === "`") {                                      // 模板串起点
      out += c; i++;
      stack.push({ kind: "tpl" });
      continue;
    }
    if (c === "/" && (lastSig === "" || PUNCT.includes(lastSig))) {
      /* 正则字面量：吃掉直到未转义、且不在字符类里的斜杠 */
      out += c; i++;
      let inClass = false;
      while (i < n) {
        const d = code[i];
        if (d === "\\") { out += d + (code[i + 1] || ""); i += 2; continue; }
        if (d === "[") inClass = true;
        else if (d === "]") inClass = false;
        else if (d === "/" && !inClass) { out += d; i++; break; }
        else if (d === "\n") break;                       // 防跑飞
        out += d; i++;
      }
      while (i < n && /[a-z]/.test(code[i])) { out += code[i]; i++; }   // 标志位
      lastSig = "/";
      continue;
    }
    if (c === "{") { frame.depth++; out += c; i++; lastSig = "{"; continue; }
    if (c === "}") {
      if (frame.depth === 0 && frame.fromTpl) {            // ${...} 结束，回到模板
        stack.pop();
        out += c; i++;
        lastSig = "}";
        continue;
      }
      frame.depth--; out += c; i++; lastSig = "}";
      continue;
    }

    out += c; i++;
    if (!/\s/.test(c)) lastSig = c;
  }
  return out;
}

/** 行级收尾：去行首缩进、压掉连续空格、丢空行。换行一律保留（ASI 靠它）。 */
function squeezeSpace(code) {
  return code
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function minify(code) {
  return squeezeSpace(stripComments(code));
}

/* ---------------- 输出 ---------------- */

function banner(version, list) {
  return [
    "/*!",
    " * Tenon v" + version + " — 单文件版（自动合并，勿手改）",
    " * 由 tools/build.js 生成；改动请改各模块源码后重新构建。",
    " * 合并顺序：",
    ...list.map((f, i) => " *   " + String(i + 1).padStart(2, " ") + ". " + f),
    " */",
    ""
  ].join("\n");
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const missing = FILES.filter((f) => !fs.existsSync(path.join(SRC, f)));
  if (missing.length) {
    console.error("缺少文件：\n  " + missing.join("\n  "));
    process.exit(1);
  }

  const parts = FILES.map((f) => ({
    file: f,
    code: fs.readFileSync(path.join(SRC, f), "utf8").replace(/\s+$/, "")
  }));

  const version = (parts[0].code.match(/Tenon\.version\s*=\s*"([^"]+)"/) || [])[1] || "0.0.0";

  /* 合并版：每个文件前留一条分隔注释，方便在 bundle 里定位 */
  const merged = banner(version, FILES) + parts.map((p) => [
    "/* ======================== " + p.file + " ======================== */",
    p.code,
    ""
  ].join("\n")).join("\n");

  /* 压缩版：每个文件先各自压缩，再拼起来 */
  const min = "/*! Tenon v" + version + " | " + FILES.length + " modules | generated by tools/build.js */\n"
    + parts.map((p) => minify(p.code)).join("\n");

  if (checkOnly) {
    const stale = [];
    [[OUT, merged], [OUT_MIN, min]].forEach(([file, want]) => {
      const have = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
      if (have !== want) stale.push(path.basename(file));
    });
    if (stale.length) {
      console.error("产物已过期：" + stale.join("、") + "\n改过源码后请重新跑 node tools/build.js");
      process.exit(1);
    }
    console.log("产物与源码一致（" + FILES.length + " 个模块）");
    return;
  }

  fs.writeFileSync(OUT, merged, "utf8");
  fs.writeFileSync(OUT_MIN, min, "utf8");

  const kb = (p) => (fs.statSync(p).size / 1024).toFixed(1) + " KB";
  const srcKB = (parts.reduce((n, p) => n + Buffer.byteLength(p.code), 0) / 1024).toFixed(1);
  console.log("源码合计  " + srcKB + " KB");
  console.log("tenon.all.js      " + kb(OUT));
  console.log("tenon.all.min.js  " + kb(OUT_MIN) + "  （压掉 " +
    (100 - fs.statSync(OUT_MIN).size / parts.reduce((n, p) => n + Buffer.byteLength(p.code), 0) * 100).toFixed(0) + "%）");
  console.log("模块数 " + FILES.length + "，版本 " + version);
}

main();
