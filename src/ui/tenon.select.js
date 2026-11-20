/* ===========================================================
   tenon.select.js — 下拉选择（单选 / 多选 / 可搜索）
   -----------------------------------------------------------
   渐进增强：页面照常写原生 select，控件负责把它变成下拉面板。

     <select tn-data="select" multiple data-placeholder="选择成员" data-search>
       <option value="1">张伟</option>
       <option value="2" selected>李娜</option>
       <option value="3" disabled>王强（停用）</option>
     </select>

   为什么要留着原生 select：
     · new FormData(form) 照旧能拿到值，表单校验、提交一行都不用改
     · 关掉 JS 时它还是个能用的 select
   控件只是把它隐藏，再把选中状态同步回去（option.selected）。

   属性：
     multiple         多选
     data-placeholder 未选时的提示文案
     data-search      显示搜索框（多选默认开）

   事件：
     change（原生）  —— 选中变化后派发，FormData 与老代码都能感知
     tenon:select    —— detail { values, value, options }

   实例 API：open / close / get / set / refresh / destroy
   =========================================================== */
Tenon.component("select", {
  selector: 'select[tn-data~="select"]',

  init(sel) {
    const kit = () => Tenon.kit;

    const multiple = sel.multiple;
    /* 可能是 i18n 默认值，切语言时要能跟着变，所以是 let */
    let placeholderText = sel.dataset.placeholder || Tenon.i18n.t("select.placeholder");
    const searchable = sel.hasAttribute("data-search") || multiple;

    /* ---------------- 骨架 ---------------- */

    const wrap = kit().node("select", "div");
    const trigger = kit().node("selectTrigger", "button");
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const panel = kit().node("selectPanel", "div");
    kit().setState(panel, "hidden", true);

    let searchInput = null;
    if (searchable) {
      const box = kit().node("selectSearch", "div");
      searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = Tenon.i18n.t("select.search");
      searchInput.setAttribute("aria-label", Tenon.i18n.t("select.search"));
      box.appendChild(searchInput);
      panel.appendChild(box);
    }

    const list = document.createElement("div");
    list.setAttribute("role", "listbox");
    if (multiple) list.setAttribute("aria-multiselectable", "true");
    panel.appendChild(list);

    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    sel.hidden = true;
    sel.setAttribute("tabindex", "-1");

    /* ---------------- 渲染 ---------------- */

    const options = () => Array.from(sel.options);
    /* 空值选项（<option value="">请选择</option>）算「未选」，
       否则原生 select 默认选中首项，占位文案永远露不出来 */
    const picked = () => options().filter((o) => o.selected && !o.disabled && o.value !== "");
    const query = () => (searchInput ? searchInput.value : "");

    function renderTrigger() {
      const chosen = picked();
      trigger.innerHTML = "";

      if (!chosen.length) {
        const span = kit().node("selectValue", "span");
        span.textContent = placeholderText;
        trigger.appendChild(span);
        kit().setState(trigger, "placeholder", true);
        return;
      }
      kit().setState(trigger, "placeholder", false);

      if (multiple) {
        chosen.forEach((o) => {
          const tag = kit().node("selectTag", "span");
          const text = document.createElement("span");
          text.textContent = o.textContent;
          const x = document.createElement("i");
          x.dataset.tagRemove = o.value;
          x.textContent = "×";
          tag.appendChild(text);
          tag.appendChild(x);
          trigger.appendChild(tag);
        });
      } else {
        const span = kit().node("selectValue", "span");
        span.textContent = chosen[0].textContent;
        trigger.appendChild(span);
      }
    }

    function renderList() {
      const q = String(query()).trim().toLowerCase();
      list.innerHTML = "";
      options().forEach((o, i) => {
        const btn = kit().node("selectOption", "button");
        btn.type = "button";
        btn.dataset.optionIndex = String(i);
        btn.textContent = o.textContent;
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-selected", o.selected ? "true" : "false");
        if (o.selected) kit().setState(btn, "active", true);
        if (o.disabled) {
          kit().setState(btn, "disabled", true);
          btn.disabled = true;
        }
        if (q && !o.textContent.toLowerCase().includes(q)) kit().setState(btn, "hidden", true);
        list.appendChild(btn);
      });
    }

    /* ---------------- 交互 ---------------- */

    const pop = Tenon.popover.create({
      wrap, trigger, panel,
      onOpen() {
        renderList();
        if (searchInput) { searchInput.focus(); return; }
        const first = Tenon.core.qsa(kit().part("selectOption"), list)
          .filter((b) => !kit().hasState(b, "hidden"));
        const target = first.find((b) => kit().hasState(b, "active")) || first[0];
        if (target) target.focus();
      }
    });
    const isOpen = pop.isOpen;

    function commit() {
      const chosen = picked();
      const values = chosen.map((o) => o.value);
      renderTrigger();
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      sel.dispatchEvent(new CustomEvent("tenon:select", {
        bubbles: true,
        detail: { values, value: multiple ? values : (values[0] || ""), options: chosen }
      }));
    }

    function choose(index) {
      const opt = sel.options[index];
      if (!opt || opt.disabled) return;
      if (multiple) {
        opt.selected = !opt.selected;
        renderList();
        commit();
      } else {
        options().forEach((o, i) => { o.selected = i === index; });
        renderList();
        commit();
        pop.hide();
      }
    }

    const offTrigger = Tenon.core.on(trigger, "click", "*", (e) => {
      if (e.target.closest("[data-tag-remove]")) return;   // 删标签不切换面板
      pop.toggle();
    });

    const offPanel = Tenon.core.on(panel, "click", "[data-option-index]", (e, btn) => {
      e.preventDefault();
      choose(Number(btn.dataset.optionIndex));
    });

    const offRemove = Tenon.core.on(trigger, "click", "[data-tag-remove]", (e, i) => {
      e.preventDefault();
      e.stopPropagation();
      const opt = options().find((o) => o.value === i.dataset.tagRemove);
      if (!opt) return;
      opt.selected = false;
      renderTrigger();
      if (isOpen()) renderList();
      commit();
    });

    const offSearch = searchInput
      ? Tenon.core.on(searchInput, "input", "*", () => renderList())
      : () => {};

    /** 键盘可达：↑↓ / Home / End 在可见项之间移动焦点，Enter 由 button 原生触发 */
    const visible = () => Tenon.core.qsa(kit().part("selectOption"), list)
      .filter((b) => !kit().hasState(b, "hidden"));

    const offKeys = Tenon.core.on(panel, "keydown", "*", (e) => {
      const items = visible();
      if (!items.length) return;
      const i = items.indexOf(document.activeElement);
      let to = -1;
      if (e.key === "ArrowDown") to = i < 0 ? 0 : Math.min(i + 1, items.length - 1);
      else if (e.key === "ArrowUp") to = i < 0 ? items.length - 1 : Math.max(i - 1, 0);
      else if (e.key === "Home") to = 0;
      else if (e.key === "End") to = items.length - 1;
      if (to < 0) return;
      e.preventDefault();
      items[to].focus();
    });

    const onLang = () => {
      placeholderText = sel.dataset.placeholder || Tenon.i18n.t("select.placeholder");
      if (searchInput) {
        searchInput.placeholder = Tenon.i18n.t("select.search");
        searchInput.setAttribute("aria-label", Tenon.i18n.t("select.search"));
      }
      renderTrigger();
      if (pop.isOpen()) renderList();
    };
    document.addEventListener("tenon:lang", onLang);

    renderTrigger();
    renderList();

    return {
      open: pop.show,
      close: pop.hide,
      isOpen: pop.isOpen,
      get: () => (multiple ? picked().map((o) => o.value) : (picked()[0] ? picked()[0].value : "")),
      set(values) {
        const want = [].concat(values).map(String);
        options().forEach((o) => { o.selected = want.includes(o.value); });
        renderList();
        commit();
      },
      refresh() { renderTrigger(); renderList(); },

      destroy() {
        offTrigger(); offPanel(); offRemove(); offSearch(); offKeys();
        document.removeEventListener("tenon:lang", onLang);
        pop.destroy();
        sel.hidden = false;
        sel.removeAttribute("tabindex");
        if (wrap.parentNode) {
          wrap.parentNode.insertBefore(sel, wrap);
          wrap.remove();
        }
      }
    };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});
