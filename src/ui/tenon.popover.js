/* ===========================================================
   tenon.popover.js — 「触发器 + 浮层」的公共开关
   -----------------------------------------------------------
   select / cascader 这类控件都是同一个动作：
     点触发器弹出面板 → 点面板外收起 → Esc 收起 → aria-expanded 跟着变
   这套行为必须一致，所以只写一遍：

     const pop = Tenon.popover({
       wrap,                // 包住 trigger 与 panel 的容器
       trigger,
       panel,
       onOpen() { … },      // 打开前填内容（渲染列表 / 定位到已选项）
       onClose() { … }      // 收起后清理
     });

     pop.show(); pop.hide(); pop.toggle(); pop.isOpen(); pop.destroy();

   状态仍然走 kit：panel 用 hidden、trigger 用 open，类名归皮肤。
   点外面判断用捕获阶段的 pointerdown —— 比 click 早，面板刚打开时的
   那次点击不会误关。
   =========================================================== */
Tenon.popover = (function () {
  const kit = () => Tenon.kit;

  function create(opt) {
    const { wrap, trigger, panel } = opt;
    let opened = false;

    function onDocDown(e) {
      if (!wrap.contains(e.target)) hide();
    }

    function onKey(e) {
      if (e.key === "Escape" && opened) {
        hide();
        trigger.focus();
      }
    }

    function show() {
      if (opened) return;
      if (opt.onOpen) opt.onOpen();
      kit().setState(panel, "hidden", false);
      kit().setState(trigger, "open", true);
      trigger.setAttribute("aria-expanded", "true");
      document.addEventListener("pointerdown", onDocDown, true);
      document.addEventListener("keydown", onKey);
      opened = true;
    }

    function hide() {
      if (!opened) return;
      kit().setState(panel, "hidden", true);
      kit().setState(trigger, "open", false);
      trigger.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", onDocDown, true);
      document.removeEventListener("keydown", onKey);
      opened = false;
      if (opt.onClose) opt.onClose();
    }

    return {
      show,
      hide,
      toggle() { if (opened) hide(); else show(); },
      isOpen: () => opened,
      destroy() { hide(); }
    };
  }

  return { create };
})();
