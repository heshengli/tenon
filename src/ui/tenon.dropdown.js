/* ===========================================================
   tenon.dropdown.js — 下拉菜单
   -----------------------------------------------------------
   两种用法：

   1) 声明式（菜单内容是临时生成的项列表）
      <button tn-data-dropdown="编辑|复制|删除">更多操作 ▾</button>
      → 点击在按钮下方弹出，最后一项标记为 danger

   2) 命令式（面板节点已在 HTML 里，或由脚本创建）
      Tenon.dropdown.open(triggerEl, panelEl)
      Tenon.dropdown.close()

   面板统一 position:fixed + 视口夹取，右对齐更稳。
   =========================================================== */
Tenon.dropdown = (function () {
  let panel = null, trigger = null, throwaway = false;

  function place(t, p) {
    const r = t.getBoundingClientRect();
    const w = p.offsetWidth, h = p.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const alignRight = p.dataset.align !== "left";
    let left = alignRight ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, vw - w - 8));
    let top = r.bottom + 6;
    if (top + h > vh - 8) top = Math.max(8, r.top - h - 6);
    p.style.left = left + "px";
    p.style.top = top + "px";
  }

  function open(t, p) {
    close();
    panel = p;
    trigger = t;
    Tenon.kit.setState(p, "hidden", false);
    place(t, p);
    if (t.hasAttribute("aria-expanded")) t.setAttribute("aria-expanded", "true");
  }

  function close() {
    if (!panel) return;
    Tenon.kit.setState(panel, "hidden", true);
    if (trigger && trigger.hasAttribute("aria-expanded")) trigger.setAttribute("aria-expanded", "false");
    if (throwaway) panel.remove();
    panel = null;
    trigger = null;
    throwaway = false;
  }

  const isOpen = () => !!panel && !Tenon.kit.hasState(panel, "hidden");

  /* 全局收起：点空白 / Esc / 滚动 / 改窗口 */
  document.addEventListener("mousedown", (e) => {
    if (!isOpen()) return;
    if (panel.contains(e.target)) return;
    if (trigger && trigger.contains(e.target)) return;
    close();
  });
  document.addEventListener("keydown", (e) => {
    if (isOpen() && e.key === "Escape") close();
  });
  document.addEventListener("scroll", () => close(), true);
  window.addEventListener("resize", () => close());

  /* ---------------- 声明式 ---------------- */

  Tenon.component("dropdown", {
    selector: "[tn-data-dropdown]",

    init(btn) {
      const off = Tenon.core.on(btn, "click", "[tn-data-dropdown]", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen() && trigger === btn) return close();

        const spec = btn.getAttribute(Tenon.attr("dropdown")) || "";
        const items = spec.split("|").filter(Boolean);
        const p = Tenon.kit.menu(items.map((text, i) => ({
          text,
          danger: i === items.length - 1 && items.length > 2
        })));
        document.body.appendChild(p);

        p.addEventListener("click", (ev) => {
          const item = ev.target.closest(Tenon.kit.part("dropdownItem"));
          if (!item) return;
          btn.dispatchEvent(new CustomEvent("tenon:dropdown", {
            bubbles: true, detail: { text: item.textContent.trim(), index: [...p.children].indexOf(item) }
          }));
          Tenon.ui.toast(Tenon.i18n.t("dropdown.clicked", { text: item.textContent.trim() }));
          close();
        });

        throwaway = true;
        open(btn, p);
      });

      return { destroy: off };
    },

    destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
  });

  return { open, close, isOpen };
})();
