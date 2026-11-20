/* ===========================================================
   Mock 数据与接口路由
   -----------------------------------------------------------
   接真实后端时：删除本文件（连同文件末尾覆盖 Tenon.ajax.get/post
   的那段），tenon.ajax 就会改用内置的 fetch 实现。
   =========================================================== */
window.MOCK_DB = {
  users: [
    { id: 1, name: "张伟", role: "管理员", age: 32, dept: "技术中心", status: "启用", email: "zhangwei@example.com" },
    { id: 2, name: "李娜", role: "编辑", age: 28, dept: "市场部", status: "启用", email: "lina@example.com" },
    { id: 3, name: "王强", role: "访客", age: 35, dept: "财务部", status: "启用", email: "wangqiang@example.com" },
    { id: 4, name: "刘洋", role: "编辑", age: 26, dept: "技术中心", status: "启用", email: "liuyang@example.com" },
    { id: 5, name: "陈静", role: "访客", age: 41, dept: "人力资源部", status: "停用", email: "chenjing@example.com" },
    { id: 6, name: "赵磊", role: "管理员", age: 38, dept: "技术中心", status: "启用", email: "zhaolei@example.com" },
    { id: 7, name: "孙倩", role: "编辑", age: 30, dept: "市场部", status: "启用", email: "sunqian@example.com" },
    { id: 8, name: "周涛", role: "访客", age: 24, dept: "财务部", status: "启用", email: "zhoutao@example.com" },
    { id: 9, name: "吴敏", role: "编辑", age: 33, dept: "技术中心", status: "启用", email: "wumin@example.com" },
    { id: 10, name: "郑爽", role: "访客", age: 29, dept: "市场部", status: "停用", email: "zhengshuang@example.com" },
    { id: 11, name: "冯磊", role: "管理员", age: 45, dept: "技术中心", status: "启用", email: "fenglei@example.com" },
    { id: 12, name: "许晴", role: "编辑", age: 27, dept: "人力资源部", status: "启用", email: "xuqing@example.com" },
    { id: 13, name: "何军", role: "访客", age: 36, dept: "财务部", status: "启用", email: "hejun@example.com" },
    { id: 14, name: "高圆", role: "编辑", age: 31, dept: "市场部", status: "启用", email: "gaoyuan@example.com" },
    { id: 15, name: "林峰", role: "访客", age: 22, dept: "技术中心", status: "停用", email: "linfeng@example.com" }
  ],
  customers: Array.from({ length: 23 }, (_, i) => ({
    id: 2026001 + i,
    name: ["张伟", "李娜", "王强", "刘洋", "陈静", "赵磊", "孙倩", "周涛"][i % 8] + (i > 7 ? i : ""),
    company: ["华信科技", "云图数据", "长风物流", "智联教育", "恒泰金融"][i % 5],
    level: ["VIP", "普通", "潜力"][i % 3],
    amount: 12000 + i * 3700,
    status: i % 4 === 0 ? "停用" : "启用",
    date: "2026-" + String((i % 9) + 1).padStart(2, "0") + "-" + String((i % 26) + 2).padStart(2, "0")
  })),
  flows: [
    { id: "LC-2026-018", title: "采购申请：5 台开发笔记本", type: "采购", status: "审批中", node: "部门经理审批", who: "张伟", date: "2026-11-18" },
    { id: "LC-2026-017", title: "差旅报销：上海客户拜访", type: "报销", status: "已完成", node: "财务复核", who: "李娜", date: "2026-11-15" },
    { id: "LC-2026-016", title: "合同用印：华信年度框架协议", type: "用印", status: "已驳回", node: "法务审核", who: "王强", date: "2026-11-12" },
    { id: "LC-2026-015", title: "服务器扩容申请", type: "IT", status: "已完成", node: "归档", who: "刘洋", date: "2026-11-08" },
    { id: "LC-2026-014", title: "市场活动预算申请", type: "预算", status: "审批中", node: "财务总监审批", who: "孙倩", date: "2026-11-06" }
  ],
  tree: [
    {
      id: 1, name: "华信科技集团", children: [
        {
          id: 11, name: "技术中心", children: [
            { id: 111, name: "前端组" }, { id: 112, name: "后端组" }, { id: 113, name: "测试组" }
          ]
        },
        { id: 12, name: "市场部", children: [{ id: 121, name: "华东区" }, { id: 122, name: "华南区" }] },
        { id: 13, name: "财务部" }
      ]
    },
    { id: 2, name: "云图数据", children: [{ id: 21, name: "数据平台部" }, { id: 22, name: "算法组" }] }
  ]
};

window.MOCK_ROUTES = {
  get: {
    "/api/users": () => MOCK_DB.users,
    "/api/customers": () => MOCK_DB.customers
  },
  post: {
    "/api/users/save": (data) => {
      if (data.id) {
        const user = MOCK_DB.users.find((u) => u.id === Number(data.id));
        if (user) Object.assign(user, { name: data.name, role: data.role, age: Number(data.age), dept: data.dept, status: data.status });
      } else {
        MOCK_DB.users.push({
          id: Math.max(...MOCK_DB.users.map((u) => u.id)) + 1,
          name: data.name, role: data.role, age: Number(data.age) || 0,
          dept: data.dept, status: data.status || "启用", email: ""
        });
      }
      return { statusCode: "200", message: "保存成功", callbackType: "closeCurrent", navTabId: "users" };
    },
    "/api/users/delete": (data) => {
      MOCK_DB.users = MOCK_DB.users.filter((u) => u.id !== Number(data.id));
      return { statusCode: "200", message: "删除成功", navTabId: "users" };
    },
    "/api/users/batch-delete": (data) => {
      const ids = (data.ids || []).map(Number);
      MOCK_DB.users = MOCK_DB.users.filter((u) => !ids.includes(u.id));
      return { statusCode: "200", message: "已删除 " + ids.length + " 条记录", navTabId: "users" };
    },
    "/api/customers/save": (data) => {
      MOCK_DB.customers.unshift({
        id: 2026100 + MOCK_DB.customers.length,
        name: data.cname, company: data.cname, level: data.level || "普通",
        amount: Number(data.amount) || 0, status: "启用", date: "2026-11-19"
      });
      return { statusCode: "200", message: "客户已保存", callbackType: "closeCurrent", navTabId: "query" };
    },
    "/api/customers/create": (data) => {
      MOCK_DB.customers.unshift({
        id: 2026200 + MOCK_DB.customers.length,
        name: data.cname,
        company: data.company || data.cname,
        level: data.level || "普通",
        amount: Number(data.amount) || 0,
        status: "启用",
        date: "2026-11-19"
      });
      return { statusCode: "200", message: "客户已添加", callbackType: "refreshCurrent" };
    },
    "/api/customers/update": (data) => {
      const c = MOCK_DB.customers.find((x) => x.id === Number(data.id));
      if (c) {
        Object.assign(c, {
          name: data.cname || c.name,
          company: data.company || c.company,
          level: data.level || c.level,
          amount: Number(data.amount) || c.amount
        });
      }
      return { statusCode: "200", message: "客户已更新", callbackType: "refreshCurrent" };
    },
    "/api/customers/delete": (data) => {
      const ids = String(data.ids || "").split(",").map(Number).filter(Boolean);
      MOCK_DB.customers = MOCK_DB.customers.filter((c) => !ids.includes(c.id));
      return { statusCode: "200", message: `已删除 ${ids.length} 个客户`, callbackType: "refreshCurrent" };
    },
    "/api/form/submit": (data) => ({
      statusCode: "200",
      message: `已保存（${Object.keys(data).length} 个字段）`,
      callbackType: "refreshCurrent"
    }),
    "/api/orders/save": (data) => ({
      statusCode: "200",
      message: `明细已提交，共 ${data.rows} 行，合计 ¥ ${Number(data.total || 0).toLocaleString()}`,
      callbackType: "none"
    }),
    "/api/flows/approve": (data) => {
      const flow = MOCK_DB.flows.find((f) => f.id === data.id);
      if (flow) {
        flow.status = data.ok === "1" ? "已完成" : "已驳回";
        flow.node = data.ok === "1" ? "归档" : "发起人修改";
      }
      return { statusCode: "200", message: data.ok === "1" ? "已同意，流程进入下一节点" : "已驳回，流程退回发起人", callbackType: "refreshCurrent" };
    },
    "/api/flows/cancel": (data) => {
      const flow = MOCK_DB.flows.find((f) => f.id === data.id);
      if (flow) {
        flow.status = "已撤销";
        flow.node = "结束";
      }
      return { statusCode: "200", message: "流程已撤销", callbackType: "refreshCurrent" };
    },
    "/api/flows/create": (data) => {
      const seq = 19 + MOCK_DB.flows.filter((f) => f.id.startsWith("LC-2026-019")).length;
      MOCK_DB.flows.unshift({
        id: "LC-2026-0" + seq, title: data.title || "未命名流程", type: data.type || "采购",
        status: "审批中", node: "部门经理审批", who: "admin", date: "2026-11-19"
      });
      return { statusCode: "200", message: "流程已提交", callbackType: "closeCurrent", navTabId: "flow-mine" };
    }
  }
};

/* ===========================================================
   把 mock 请求器挂到框架上
   -----------------------------------------------------------
   tenon.ajax 的 get / post 默认走 fetch（接真实后端），
   这里用读 MOCK_ROUTES 的实现覆盖掉它，并加一点人工延时，
   好让 loading / toast 这些反馈有迹可循。

   接真实后端时：删除本文件 + 这段覆盖，tenon.ajax 就会走 fetch。
   =========================================================== */
(function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  Tenon.ajax.get = async function (url, params) {
    await sleep(200);
    const routes = (window.MOCK_ROUTES && MOCK_ROUTES.get) || {};
    const handler = routes[url];
    if (!handler) return { statusCode: "404", message: "接口不存在：" + url };
    return { statusCode: "200", message: "OK", data: handler(params || {}) };
  };

  Tenon.ajax.post = async function (url, data) {
    await sleep(280);
    const routes = (window.MOCK_ROUTES && MOCK_ROUTES.post) || {};
    const handler = routes[url];
    if (!handler) return { statusCode: "404", message: "接口不存在：" + url };
    return handler(data || {});
  };
})();
