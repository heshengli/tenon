/* ===========================================================
   tenon.core.js — 命名空间与版本
   -----------------------------------------------------------
   Tenon（榫）：页面只写标记，行为靠属性咬合。
   榫头由控件提供，卯眼由框架预留，靠形状咬合，不用一根钉子。

   本文件只做两件事：建命名空间、写版本号。
   不放任何逻辑，因此它必须是第一个被加载的文件。

   分层（依赖方向单向）：
     core  ←  ui  ←  shell  ←  pages

   命名只有一处，不设别名。
   =========================================================== */
window.Tenon = window.Tenon || {};

/** 语义化版本：主版本.次版本.修订号 */
Tenon.version = "2.0.0";

/**
 * 框架自有属性的前缀。
 *
 *   1. 框架命名空间 —— tn-data / tn-data-* ：「这里是什么控件」+ 框架内部参数
 *   2. 控件公开参数 —— data-<短名>：如 data-page-size、data-rule（不带本前缀）
 *
 * 有四个控件天生就需要一个参数，那个参数兼作声明：tn-data-dialog、tn-data-dropdown、
 * tn-data-validate、tn-data-toast。再让它们写一遍 tn-data="dialog" 只是重复。
 *
 * 所有**运行时算出来**的属性名都走 Tenon.attr()，别处不要再手拼前缀。
 *
 * 注意边界：改 PREFIX 只影响运行期生成的属性名（tn-data-state-* / tn-data-part），
 * 页面里写死的标记和控件的静态选择器要一起改 —— 换句话说，它是一处「单一来源」，
 * 不是「改一个常量就全站改名」的魔法。
 */
Tenon.PREFIX = "tn-data";

/** 拼框架属性名：attr() → "tn-data"，attr("part") → "tn-data-part" */
Tenon.attr = function (suffix) {
  return Tenon.PREFIX + (suffix ? "-" + suffix : "");
};
