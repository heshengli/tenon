/* ===========================================================
   tenon.upload.js — 文件选择（点击 / 拖拽 / 限制 / 列表）
   -----------------------------------------------------------
   还是「增强原生元素」那一套：页面写原生 file input，控件接管交互。

     <input type="file" tn-data="upload" multiple
            data-accept-hint="支持 png / pdf"
            data-max-size="5"      <!-- 单个文件上限，单位 MB -->
            data-max-count="5">    <!-- 最多几个 -->

   为什么留着原生 input：
     · new FormData(form) 照旧拿到文件，提交逻辑一行都不用改
     · 关掉 JS 时它还是个能用的文件选择框

   控件自己维护一份文件数组（原生 FileList 只读，删不掉单个文件），
   每次变更后尽力同步回 input.files —— 同步不了也不影响 inst.files 与事件。

   注意：这里只管「选」，不管「传」。上传是宿主的事（进度、分片、直传都不一样）。

   事件：change（原生）/ tenon:upload { files, rejected }
   实例 API：files() / clear() / add(fileList) / remove(index) / destroy()
   =========================================================== */
Tenon.component("upload", {
  selector: 'input[type="file"][tn-data~="upload"]',

  init(input) {
    const kit = () => Tenon.kit;
    const T = (k, v) => Tenon.i18n.t(k, v);

    const multiple = input.multiple;
    const maxSize = (Number(input.dataset.maxSize) || 0) * 1024 * 1024;   // 0 = 不限
    const maxCount = Number(input.dataset.maxCount) || (multiple ? 0 : 1);
    const acceptHint = input.dataset.acceptHint || "";

    let files = [];        // 我们的真源；FileList 不可变，删不了单个
    let rejected = [];     // 最近一次被拒的文件，随事件一起给出

    /* ---------------- 骨架 ---------------- */

    const wrap = kit().node("upload", "div");
    const zone = kit().node("uploadZone", "button");
    zone.type = "button";

    const hint = document.createElement("span");
    zone.appendChild(hint);

    const list = kit().node("uploadList", "ul");
    kit().setState(list, "hidden", true);

    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    wrap.appendChild(zone);
    wrap.appendChild(list);
    input.hidden = true;                  // 还在 form 里，只是不显示原生那套 UI

    /* ---------------- 渲染 ---------------- */

    function humanSize(bytes) {
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / 1024 / 1024).toFixed(1) + " MB";
    }

    function paintHint() {
      const bits = [T("upload.hint")];
      const limits = [];
      if (maxCount) limits.push(T("upload.limitCount", { n: maxCount }));
      if (maxSize) limits.push(T("upload.limitSize", { n: Math.round(maxSize / 1024 / 1024) }));
      if (limits.length) bits.push("（" + limits.join("，") + "）");
      if (acceptHint) bits.push(" " + acceptHint);
      hint.textContent = bits.join("");
    }

    function paintList() {
      list.innerHTML = "";
      kit().setState(list, "hidden", files.length === 0);
      files.forEach((f, i) => {
        const li = kit().node("uploadItem", "li");

        const name = kit().node("uploadName", "span");
        name.textContent = f.name;

        const size = kit().node("uploadSize", "span");
        size.textContent = humanSize(f.size);

        const del = kit().node("uploadRemove", "button");
        del.type = "button";
        del.dataset.index = String(i);
        del.setAttribute("aria-label", T("upload.remove"));
        del.textContent = "×";

        li.appendChild(name);
        li.appendChild(size);
        li.appendChild(del);
        list.appendChild(li);
      });
    }

    /** 尽量把我们的数组同步回原生 input，让 FormData 拿到文件 */
    function syncInput() {
      try {
        const dt = new DataTransfer();
        files.forEach((f) => dt.items.add(f));
        input.files = dt.files;
      } catch (e) {
        /* 个别浏览器不允许赋值，忽略：inst.files 仍然是准的 */
      }
    }

    function emit(reason) {
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new CustomEvent("tenon:upload", {
        bubbles: true,
        detail: { files: files.slice(), rejected: rejected.slice(), reason }
      }));
    }

    /* ---------------- 加文件 ---------------- */

    function add(incoming) {
      rejected = [];
      const list_ = Array.prototype.slice.call(incoming || []);

      list_.forEach((f) => {
        if (maxSize && f.size > maxSize) {
          rejected.push(f);
          Tenon.ui.toast(T("upload.tooLarge", { name: f.name, size: Math.round(maxSize / 1024 / 1024) }), "error");
          return;
        }
        if (maxCount && files.length >= maxCount) {
          rejected.push(f);
          return;
        }
        const dup = files.some((x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified);
        if (!dup) files.push(f);
      });

      if (rejected.length && files.length >= maxCount) {
        Tenon.ui.toast(T("upload.tooMany", { n: maxCount }), "error");
      }

      syncInput();
      paintList();
      if (list_.length) emit("add");
      return files.length;
    }

    /* ---------------- 交互 ---------------- */

    const offZone = Tenon.core.on(zone, "click", "*", () => input.click());

    const offChange = Tenon.core.on(input, "change", "*", () => {
      /* 用户用原生对话框选的：直接接管进数组，再清空原生选择，
         避免下次选同一个文件不触发 change */
      if (input.files && input.files.length) {
        const picked = Array.prototype.slice.call(input.files);
        if (!multiple) files = [];        // 单选：新选择替换旧的
        add(picked);                       // 多选：追加（add 里有去重）
      }
    });

    const offRemove = Tenon.core.on(list, "click", "[data-index]", (e, btn) => {
      e.preventDefault();
      const i = Number(btn.dataset.index);
      if (i >= 0 && i < files.length) {
        files.splice(i, 1);
        syncInput();
        paintList();
        emit("remove");
      }
    });

    /* 拖拽：只用 dragover 高亮 + drop 收文件，别接管整页 */
    const offOver = Tenon.core.on(zone, "dragover", "*", (e) => {
      e.preventDefault();
      kit().setState(zone, "over", true);
    });
    const offLeave = Tenon.core.on(zone, "dragleave", "*", () => {
      kit().setState(zone, "over", false);
    });
    const offDrop = Tenon.core.on(zone, "drop", "*", (e) => {
      e.preventDefault();
      kit().setState(zone, "over", false);
      const dt = e.dataTransfer;
      if (!dt || !dt.files || !dt.files.length) return;
      if (!multiple) files = [];
      add(dt.files);
    });

    /* ---------------- 收尾 ---------------- */

    paintHint();
    paintList();

    return {
      files: () => files.slice(),
      count: () => files.length,
      clear() {
        files = [];
        syncInput();
        paintList();
        emit("clear");
      },
      add,
      remove(i) {
        if (i >= 0 && i < files.length) {
          files.splice(i, 1);
          syncInput();
          paintList();
          emit("remove");
        }
      },
      destroy() {
        offZone(); offChange(); offRemove(); offOver(); offLeave(); offDrop();
        input.hidden = false;
        if (wrap.parentNode) {
          wrap.parentNode.insertBefore(input, wrap);
          wrap.remove();
        }
      }
    };
  },

  destroy(node, inst) { if (inst && inst.destroy) inst.destroy(); }
});
