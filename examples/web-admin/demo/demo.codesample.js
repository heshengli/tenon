/* ===========================================================
   tenon.codesample.js — 组件示例代码（查看 / 收起 / 复制）
   -----------------------------------------------------------
   结构（由页面 HTML 自带，脚本只增强）：

     <div class="api-demo"> …演示标记… </div>
     <div class="api-src-wrap">
       <div class="api-src-bar">
         <button class="api-src-tog" data-api-src>…查看代码…</button>
         <button class="api-src-copy" data-api-copy>…复制…</button>
       </div>
       <pre class="api-src hidden"><code>…</code></pre>
     </div>

   代码不手写、也不从别处同步：直接把 .api-demo 的 DOM 序列化成代码，
   所以“看到的 = 贴出去的”。改 HTML 后刷新即得新代码。

   序列化规则：
     · .api-block / .api-row 是排版容器，解包不输出
     · .api-label / .api-code 是说明文字，转成 <!-- 注释 -->
     · 内联 <svg> 折叠成 <!-- svg -->（否则图标示例几百行路径）
     · 空值属性输出裸属性（disabled="" → disabled）
     · 折行按结构判定：只有文本/注释/svg/只装 svg 的壳/空壳元素能同行
     · [data-no-code] 的元素整棵子树不进示例，属性本身也不输出
   =========================================================== */
Tenon.component("codesample", {
  selector: ".api-demo",

  init(demo) {
    const wrap = demo.nextElementSibling;
    if (!wrap || !wrap.classList.contains("api-src-wrap")) return null;
    const pre = wrap.querySelector(".api-src");
    if (!pre) return null;

    /* 重新生成，保证与演示 DOM 一致；失败则保留 HTML 里的静态内容 */
    const code = demoCode(demo.innerHTML);
    if (code) {
      const codeEl = pre.querySelector("code") || pre.appendChild(document.createElement("code"));
      codeEl.innerHTML = highlight(code);
    }

    const offTog = Tenon.core.on(wrap, "click", "[data-api-src]", (e, btn) => {
      const closed = pre.classList.toggle("hidden");
      wrap.classList.toggle("open", !closed);
      const label = btn.querySelector("span");
      if (label) label.textContent = closed ? "查看代码" : "收起代码";
    });

    const offCopy = Tenon.core.on(wrap, "click", "[data-api-copy]", (e, btn) => {
      const text = pre.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          () => Tenon.ui.toast("代码已复制到剪贴板", "success"),
          () => Tenon.ui.toast("复制失败，请展开后手动选择", "error"));
      } else {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        Tenon.ui.toast("已选中代码，按 Ctrl+C 复制", "info");
      }
    });

    return { code, destroy() { offTog(); offCopy(); } };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});

/* ===========================================================
   DOM → 代码文本
   =========================================================== */

const VOID_TAG = new Set(["area", "base", "br", "col", "embed", "hr", "img",
  "input", "link", "meta", "param", "source", "track", "wbr"]);

const UNWRAP_CLS = new Set(["api-block", "api-row"]);   // 纯排版容器，不进示例
const INLINE_MAX = 120;                                 // 安全阈值，防止属性过长把行拉爆

/* 控件初始化时会往节点上加状态属性，这些不属于“原始代码” */
const STRIP_ATTR = new Set(["tn-data-done", "tn-data", "aria-checked",
  "aria-expanded", "aria-hidden", "role", "tabindex", "data-value"]);

function attrsOf(el) {
  return [...el.attributes]
    .filter((a) => !STRIP_ATTR.has(a.name))
    .map((a) => {
      const v = a.name === "class" ? a.value.trim().replace(/\s+/g, " ") : a.value;
      return v === "" ? ` ${a.name}` : ` ${a.name}="${v}"`;
    }).join("");
}

/* 只在承载内联 svg 的包装元素（.a-icon 之类）才允许跟文字排在同一行 */
function isIconish(el) {
  const kids = [...el.childNodes].filter((n) =>
    n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim()));
  return kids.length === 1 && kids[0].nodeType === 1
    && kids[0].tagName.toLowerCase() === "svg";
}

function tryInline(el) {
  const tag = el.tagName.toLowerCase();
  const open = `<${tag}${attrsOf(el)}>`;
  if (VOID_TAG.has(tag)) return open;
  if (isIconish(el)) return `${open}<!-- svg --></${tag}>`;

  let inner = "";
  for (const n of el.childNodes) {
    if (n.nodeType === 3) {
      inner += n.textContent.trim().replace(/\s+/g, " ");
    } else if (n.nodeType === 1) {
      if (n.hasAttribute("data-no-code")) continue;
      const t = n.tagName.toLowerCase();
      if (t === "svg") inner += "<!-- svg -->";
      else if (isIconish(n)) inner += `<${t}${attrsOf(n)}><!-- svg --></${t}>`;
      else if (!n.children.length && !n.textContent.trim()) {
        inner += VOID_TAG.has(t) ? `<${t}${attrsOf(n)}>` : `<${t}${attrsOf(n)}></${t}>`;
      } else return null;
    } else continue;
    if (inner.length > INLINE_MAX) return null;
  }
  const html = `${open}${inner.trim()}</${tag}>`;
  return html.length > INLINE_MAX ? null : html;
}

function childLines(parent, depth, out) {
  [...parent.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      const t = n.textContent.trim().replace(/\s+/g, " ");
      if (t) out.push("  ".repeat(depth) + t);
    } else if (n.nodeType === 8) {
      out.push("  ".repeat(depth) + `<!--${n.textContent}-->`);
    } else if (n.nodeType === 1) {
      blockLines(n, depth, out);
    }
  });
}

function blockLines(el, depth, out) {
  const pad = "  ".repeat(depth);
  const tag = el.tagName.toLowerCase();
  const cls = el.classList;

  if (el.hasAttribute("data-no-code")) return;

  if (cls.contains("api-label") || cls.contains("api-code")) {
    out.push(`${pad}<!-- ${el.textContent.trim()} -->`);
    return;
  }
  if ([...cls].some((c) => UNWRAP_CLS.has(c))) {
    childLines(el, depth, out);
    return;
  }
  if (tag === "svg") {
    out.push(`${pad}<!-- svg -->`);
    return;
  }

  const one = tryInline(el);
  if (one) { out.push(pad + one); return; }

  out.push(`${pad}<${tag}${attrsOf(el)}>`);
  childLines(el, depth + 1, out);
  out.push(`${pad}</${tag}>`);
}

function demoCode(html) {
  const box = document.createElement("div");
  box.innerHTML = html;
  const out = [];
  childLines(box, 0, out);
  return out.join("\n");
}

/* ---------------- 语法高亮 ---------------- */
/* 先 esc 再按实体匹配：注释 → 标签名 → 属性名/属性值 */
function highlight(src) {
  return Tenon.core.esc(src)
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-com">$1</span>')
    .replace(/(&lt;\/?)([a-z][\w-]*)/g, '$1<span class="tok-tag">$2</span>')
    .replace(/([\w-]+)=(&quot;[^]*?&quot;)/g,
      '<span class="tok-attr">$1</span>=<span class="tok-str">$2</span>');
}
