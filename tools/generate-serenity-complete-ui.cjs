const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const OUT_DIR = "D:\\Projects\\AfterClass\\设计稿\\Serenity-Neumorphic-完整新版";

const theme = {
  bg: "#EAF1F7",
  surface: "#EAF1F7",
  surface2: "#F2F6FA",
  text: "#2D3748",
  muted: "#6B7C93",
  primary: "#86A9BB",
  primaryDark: "#516173",
  purple: "#8B5CF6",
  mint: "#83C7B7",
  peach: "#F2BFA2",
  warn: "#D97706",
  danger: "#E66A6A",
  ok: "#4CA77B",
};

const pages = [
  ["01-admin-dashboard.png", "desktop", adminDashboard],
  ["02-admin-students-classes.png", "desktop", adminStudentsCampus],
  ["03-admin-attendance-homework.png", "desktop", adminAttendanceHomework],
  ["04-admin-billing-notices.png", "desktop", adminBillingNotices],
  ["05-admin-ai-log.png", "desktop", adminAiLog],
  ["06-teacher-today.png", "tablet", teacherToday],
  ["07-teacher-ai-quick-entry.png", "tablet", teacherAiEntry],
  ["08-teacher-homework-feedback.png", "tablet", teacherHomeworkFeedback],
  ["09-parent-home.png", "mobile", parentHome],
  ["10-parent-ai-assistant-leave.png", "mobile", parentAiLeave],
  ["11-parent-homework-attendance-billing.png", "mobile", parentHomeworkAttendance],
  ["12-parent-profile-notices.png", "mobile", parentProfile],
  ["13-student-today-task.png", "student", studentToday],
  ["14-student-learning-homework.png", "student", studentLearning],
  ["15-login-role-switch.png", "login", loginRoleSwitch],
  ["00-overview-board.png", "overview", overviewBoard],
];

const viewports = {
  desktop: { width: 1500, height: 1060 },
  tablet: { width: 1366, height: 1000 },
  mobile: { width: 860, height: 1840 },
  student: { width: 1040, height: 1600 },
  login: { width: 1280, height: 900 },
  overview: { width: 1600, height: 1050 },
};

function css(type = "desktop") {
  const t = theme;
  return `
  *{box-sizing:border-box}
  body{margin:0;background:${t.bg};color:${t.text};font-family:"Inter","Microsoft YaHei","PingFang SC",Arial,sans-serif;letter-spacing:0}
  .page{width:100vw;height:100vh;overflow:hidden;background:${t.bg}}
  .soft{background:${t.surface};box-shadow:-10px -10px 24px rgba(255,255,255,.78),10px 10px 24px rgba(114,132,150,.20);border-radius:24px}
  .inset{background:${t.surface};box-shadow:inset 5px 5px 12px rgba(114,132,150,.18),inset -5px -5px 12px rgba(255,255,255,.82);border-radius:20px}
  .pill{height:42px;border-radius:999px;padding:0 16px;display:inline-flex;align-items:center;gap:8px;background:${t.surface};box-shadow:inset 4px 4px 10px rgba(114,132,150,.14),inset -4px -4px 10px rgba(255,255,255,.82);font-size:14px;color:${t.primaryDark}}
  .btn{height:42px;border-radius:999px;padding:0 18px;display:inline-flex;align-items:center;justify-content:center;gap:8px;background:${t.surface};box-shadow:-6px -6px 14px rgba(255,255,255,.82),6px 6px 14px rgba(114,132,150,.18);font-size:14px;font-weight:700;color:${t.primaryDark}}
  .btn.primary{background:linear-gradient(135deg,${t.primary},${t.purple});color:white;box-shadow:8px 8px 18px rgba(114,132,150,.22),-6px -6px 16px rgba(255,255,255,.72)}
  .tag{border-radius:999px;padding:5px 10px;background:#DFEAF1;color:${t.primaryDark};font-size:12px;font-weight:800;display:inline-flex;align-items:center}
  .tag.ok{background:#DDF2EA;color:${t.ok}} .tag.warn{background:#F7E8D2;color:${t.warn}} .tag.danger{background:#F8DCDC;color:${t.danger}} .tag.purple{background:#E9E2FF;color:${t.purple}}
  h1,h2,h3,p{margin:0} .muted{color:${t.muted}} .small{font-size:13px}.row{display:flex;gap:14px;align-items:center}.between{display:flex;align-items:center;justify-content:space-between;gap:16px}.grid{display:grid;gap:18px}
  .num{font-size:30px;font-weight:900;color:${t.text}} .label{font-size:13px;color:${t.muted};margin-bottom:8px}
  .admin{display:grid;grid-template-columns:230px 1fr;height:100%}
  .side{padding:24px 16px;display:flex;flex-direction:column;gap:20px}
  .brand{font-size:24px;font-weight:900;display:flex;align-items:center;gap:12px;color:${t.text}}
  .logo{width:42px;height:42px;border-radius:16px;background:${t.surface};display:grid;place-items:center;color:${t.purple};box-shadow:-7px -7px 16px rgba(255,255,255,.82),7px 7px 16px rgba(114,132,150,.20)}
  .nav{display:flex;flex-direction:column;gap:9px}.nav div{height:42px;border-radius:999px;padding:0 14px;display:flex;align-items:center;gap:10px;color:${t.muted};font-size:14px}.nav .active{color:${t.text};font-weight:800;box-shadow:inset 5px 5px 12px rgba(114,132,150,.18),inset -5px -5px 12px rgba(255,255,255,.82)}
  .main{padding:22px 28px 26px;min-width:0}.top{height:56px;display:flex;align-items:center;gap:14px}.search{margin-left:auto;width:360px}
  .content{height:calc(100vh - 78px);padding-top:16px;overflow:hidden}.title{font-size:30px;font-weight:900}.sub{font-size:14px;color:${t.muted};margin-top:6px}
  table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:11px 10px;border-bottom:1px solid rgba(99,119,139,.14);vertical-align:middle}th{text-align:left;color:${t.muted};font-weight:800;background:rgba(255,255,255,.28)}
  .metric{padding:18px}.panel{padding:18px}.panel h3{font-size:17px;margin-bottom:14px}
  .barChart{height:180px;display:flex;align-items:end;gap:14px;padding:18px}.barChart i{flex:1;border-radius:10px 10px 0 0;background:linear-gradient(180deg,${t.primary},${t.purple})}.barChart i:nth-child(2n){background:linear-gradient(180deg,${t.mint},${t.primary})}.barChart i:nth-child(3n){background:linear-gradient(180deg,${t.peach},${t.warn})}
  .donut{width:128px;height:128px;border-radius:50%;background:conic-gradient(${t.primary} 0 58%,${t.purple} 58% 80%,${t.mint} 80% 94%,#D7E2EA 94%);display:grid;place-items:center}.donut b{width:78px;height:78px;border-radius:50%;background:${t.surface};display:grid;place-items:center}
  .phone{width:100%;height:100%;padding:48px 34px 24px;position:relative;background:linear-gradient(180deg,#EAF1F7 0%,#F4EFF7 48%,#EDF6F1 100%)}
  .status{height:32px;display:flex;justify-content:space-between;font-size:22px;font-weight:900;margin-bottom:30px}
  .mobileTitle{font-size:34px;font-weight:900}.mobileSub{font-size:20px;color:${t.muted};margin-top:8px}
  .mcard{background:${t.surface};border-radius:30px;padding:24px;box-shadow:-9px -9px 22px rgba(255,255,255,.80),9px 9px 22px rgba(114,132,150,.20)}
  .bottomNav{position:absolute;left:30px;right:30px;bottom:24px;height:98px;border-radius:36px;background:${t.surface};box-shadow:-8px -8px 20px rgba(255,255,255,.78),8px 8px 20px rgba(114,132,150,.22);display:grid;grid-template-columns:repeat(5,1fr);align-items:center;text-align:center;color:${t.muted};font-size:16px}.bottomNav .on{color:${t.purple};font-weight:900}
  .homeworkImg{height:220px;border-radius:24px;background:linear-gradient(135deg,#F8FBFD,#DCE8F0);position:relative;overflow:hidden;box-shadow:inset 5px 5px 12px rgba(114,132,150,.12),inset -5px -5px 12px rgba(255,255,255,.82)}
  .homeworkImg:before{content:"";position:absolute;inset:24px;background:repeating-linear-gradient(#9BAEC0 0 2px,transparent 2px 26px);opacity:.55}.markWrong{position:absolute;border:4px solid ${t.danger};border-radius:999px;transform:rotate(-12deg)}
  .teacher{height:100%;padding:24px}.teacherTop{height:66px;display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.teacherGrid{display:grid;grid-template-columns:320px 1fr 390px;gap:18px;height:calc(100% - 84px)}
  .studentRow{display:grid;grid-template-columns:46px 1fr auto auto;gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid rgba(99,119,139,.12)}.avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,${t.primary},${t.purple});display:grid;place-items:center;color:white;font-weight:900}
  .login{height:100%;display:grid;grid-template-columns:1.05fr .95fr;background:radial-gradient(circle at 20% 20%,#F7F9FB 0,#EAF1F7 36%,#DCE7EF 100%)}.loginHero{padding:72px}.loginHero h1{font-size:56px;line-height:1.1}.loginPanel{margin:70px 72px;padding:34px}
  .overview{padding:22px;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);gap:16px;height:100%}.mini{padding:16px;overflow:hidden}.mini h3{margin-bottom:10px}.fakeLine{height:10px;border-radius:999px;background:#CAD8E3;margin:8px 0}.fakeBox{height:86px;border-radius:18px;background:linear-gradient(135deg,#F8FBFD,#DCE8F0);margin-top:8px}
  `;
}

function html(body, type) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css(type)}</style></head><body>${body}</body></html>`;
}

function adminShell(active, inner) {
  const nav = ["首页总览", "校区管理", "学生班级", "考勤作业", "收费核算", "AI日志", "通知设置"];
  return html(`<div class="page admin"><aside class="side"><div class="brand"><div class="logo">晚</div><div>晚辅托管</div></div><div class="nav">${nav.map(n => `<div class="${n === active ? "active" : ""}">● ${n}</div>`).join("")}</div><div class="soft" style="margin-top:auto;padding:16px"><b>总校长视图</b><p class="muted small" style="margin-top:8px">支持校区筛选、跨校区汇总和权限隔离</p></div></aside><main class="main"><div class="top"><div class="pill">全部校区</div><div class="pill">2026-05-01</div><div class="pill search">搜索学生、班级、校区、功能</div><div class="btn">通知 12</div><div class="btn primary">张校长</div></div><section class="content">${inner}</section></main></div>`, "desktop");
}

function metrics(items) {
  return `<div class="grid" style="grid-template-columns:repeat(${items.length},1fr)">${items.map(i => `<div class="soft metric"><div class="label">${i[0]}</div><div class="num">${i[1]}</div><div class="muted small">${i[2]}</div></div>`).join("")}</div>`;
}

function adminDashboard() {
  return adminShell("首页总览", `
    <div class="between"><div><h1 class="title">多校区运营总览</h1><div class="sub">总校长可查看全部校区汇总，校区管理员仅查看授权校区</div></div><div class="row"><div class="btn">导出日报</div><div class="btn primary">AI 经营分析</div></div></div>
    <div style="margin-top:18px">${metrics([["今日到托","386","阳光校区 128 / 星河校区 96 / 城南校区 162"],["出勤率","93.4%","较昨日 +1.8%"],["待确认请假","9","中风险，需人工确认"],["收费到期","42","仅校长/老师端可见余额"],["作业发布率","88.2%","含原图与批改图"],["班级毛利","¥18,620","按校区汇总"]])}</div>
    <div class="grid" style="grid-template-columns:1.1fr .9fr .8fr;margin-top:18px">
      <div class="soft panel"><h3>校区出勤趋势</h3><div class="barChart">${[80,62,74,91,68,83,95].map(h => `<i style="height:${h}%"></i>`).join("")}</div></div>
      <div class="soft panel"><h3>校区状态</h3><table><tr><th>校区</th><th>到托</th><th>作业</th><th>余额/欠费</th><th>毛利</th></tr>${[["阳光校区","128","91%","¥3,240","¥6,420"],["星河校区","96","86%","¥1,680","¥4,880"],["城南校区","162","88%","¥4,910","¥7,320"]].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="danger">${r[3]}</td><td>${r[4]}</td></tr>`).join("")}</table></div>
      <div class="soft panel"><h3>AI 风险提醒</h3>${["跨校区转移学生为高风险，不由 AI 执行", "城南校区 12 名学生服务 7 天内到期", "星河校区作业批改图发布率偏低", "阳光校区老师课费待确认 3 条"].map((x,i)=>`<p style="margin:12px 0"><span class="tag ${i===0?"danger":i===1?"warn":"purple"}">${i===0?"高风险":i===1?"提醒":"建议"}</span> ${x}</p>`).join("")}</div>
    </div>
    <div class="grid" style="grid-template-columns:1fr 1fr;margin-top:18px">
      <div class="soft panel"><h3>今日操作流</h3><table><tr><th>时间</th><th>校区</th><th>动作</th><th>状态</th></tr>${[["14:10","阳光校区","批量发布 28 份作业反馈","成功"],["14:05","城南校区","老师拍照签到 42 人","完成"],["13:50","星河校区","AI 生成班级日报草稿","待确认"],["13:20","总校","查询校区毛利排行","成功"]].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td><span class="tag ok">${r[3]}</span></td></tr>`).join("")}</table></div>
      <div class="soft panel"><h3>今日作业真实反馈</h3><div class="row"><div class="donut"><b>88%</b></div><div><p><b>已发布 316 份</b></p><p class="muted">其中 289 份包含作业原图，276 份包含老师确认后的批改图。</p><p style="margin-top:12px"><span class="tag ok">行为表现</span> <span class="tag purple">作业完成</span> <span class="tag">知识掌握</span></p></div></div></div>
    </div>
  `);
}

function adminStudentsCampus() {
  return adminShell("学生班级", `
    <div class="between"><div><h1 class="title">校区、学生与班级管理</h1><div class="sub">学生、班级、老师均关联校区；身份证号默认脱敏</div></div><div class="row"><div class="btn">批量导入</div><div class="btn primary">新增学生</div></div></div>
    <div style="margin-top:18px">${metrics([["校区数","3","启用 3 / 停用 0"],["在读学生","1,246","本月新增 46"],["老师数","38","跨校区 5 人"],["班级数","42","按校区独立管理"]])}</div>
    <div class="grid" style="grid-template-columns:.8fr 1.2fr;margin-top:18px">
      <div class="soft panel"><h3>校区档案</h3>${[["阳光校区","启用","王老师","128 人"],["星河校区","启用","李老师","96 人"],["城南校区","启用","陈老师","162 人"]].map(r=>`<div class="inset" style="padding:16px;margin-bottom:14px"><div class="between"><b>${r[0]}</b><span class="tag ok">${r[1]}</span></div><p class="muted small">负责人：${r[2]} · 今日到托：${r[3]}</p></div>`).join("")}<div class="btn primary" style="width:100%">新增校区</div></div>
      <div class="soft panel"><h3>学生档案</h3><table><tr><th>学生</th><th>校区</th><th>班级</th><th>托管类型</th><th>身份证号</th><th>服务状态</th><th>操作</th></tr>${[["王小雨","阳光校区","三年级(2)班","晚全托","3201**********1234","正常"],["李思源","星河校区","四年级(1)班","晚辅导","3201**********8821","7天到期"],["陈一诺","城南校区","三年级(1)班","下午托","3201**********3398","欠费提醒"],["周雨桐","阳光校区","二年级(2)班","中午托","3201**********6621","正常"]].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td><span class="tag ${r[5]==="正常"?"ok":r[5].includes("欠费")?"danger":"warn"}">${r[5]}</span></td><td style="color:${theme.purple};font-weight:800">查看 / 分班</td></tr>`).join("")}</table></div>
    </div>
  `);
}

function adminAttendanceHomework() {
  return adminShell("考勤作业", `
    <div class="between"><div><h1 class="title">考勤、拍照签到与作业反馈</h1><div class="sub">校区维度追踪到托照片、作业原图、批改图和三类点评发布状态</div></div><div class="row"><div class="pill">阳光校区</div><div class="btn primary">查看待确认</div></div></div>
    <div class="grid" style="grid-template-columns:.85fr 1.15fr;margin-top:18px">
      <div class="soft panel"><h3>拍照签到</h3><table><tr><th>学生</th><th>托管</th><th>状态</th><th>照片</th><th>通知</th></tr>${[["王小雨","晚全托","已到托","已上传","已推送"],["张一诺","晚辅导","待确认","匹配失败","未推送"],["李思源","下午托","请假","无","家长申请"],["赵天宇","晚全托","已到托","已上传","已推送"]].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td><span class="tag ${r[2]==="已到托"?"ok":r[2]==="请假"?"warn":"danger"}">${r[2]}</span></td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join("")}</table></div>
      <div class="soft panel"><h3>作业反馈发布追踪</h3><table><tr><th>学生</th><th>校区</th><th>原图</th><th>批改图</th><th>三类点评</th><th>家长可见</th></tr>${[["王小雨","阳光校区","2张","2张","完整","已发布"],["陈一诺","城南校区","1张","草稿","待补充","未发布"],["周雨桐","阳光校区","3张","3张","完整","已发布"],["李思源","星河校区","0张","0张","请假","无"]].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td><span class="tag ${r[5]==="已发布"?"ok":r[5]==="未发布"?"warn":""}">${r[5]}</span></td></tr>`).join("")}</table></div>
    </div>
    <div class="grid" style="grid-template-columns:1fr 1fr 1fr;margin-top:18px">
      ${["原始作业照片","老师确认批改图","三类总结点评"].map((title,i)=>`<div class="soft panel"><h3>${title}</h3><div class="homeworkImg">${i===1?'<div class="markWrong" style="left:44%;top:34%;width:120px;height:70px"></div><div class="markWrong" style="left:18%;top:62%;width:90px;height:50px"></div>':""}</div><p class="muted small" style="margin-top:12px">${i===0?"家长看到真实书写与完成状态":i===1?"只展示老师确认后的圈错标注":"行为表现、作业完成、知识掌握"}</p></div>`).join("")}
    </div>
  `);
}

function adminBillingNotices() {
  return adminShell("收费核算", `
    <div class="between"><div><h1 class="title">收费、低频提醒与班级核算</h1><div class="sub">家长端不展示余额/欠费金额；校长和老师端按权限查看</div></div><div class="row"><div class="pill">月缴 / 学期缴</div><div class="btn primary">生成校区核算</div></div></div>
    <div style="margin-top:18px">${metrics([["应收合计","¥328,560","全部校区"],["实收合计","¥307,860","月缴+学期缴"],["余额/欠费","¥20,700","仅管理/老师端"],["7天内到期","42人","低频提醒"]])}</div>
    <div class="grid" style="grid-template-columns:1.1fr .9fr;margin-top:18px">
      <div class="soft panel"><h3>校区收费记录</h3><table><tr><th>学生</th><th>校区</th><th>周期</th><th>缴费方式</th><th>余额/欠费</th><th>老师可见</th></tr>${[["王小雨","阳光校区","05-01 至 05-31","月缴","¥0","正常"],["陈一诺","城南校区","05-01 至 05-31","月缴","欠 ¥280","提醒"],["李思源","星河校区","春季学期","学期缴","¥0","正常"],["赵天宇","阳光校区","05-06 至 06-05","月缴","7天到期","提醒"]].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><span class="tag ${r[4].includes("欠")?"danger":r[4].includes("到期")?"warn":"ok"}">${r[4]}</span></td><td>${r[5]}</td></tr>`).join("")}</table></div>
      <div class="soft panel"><h3>家长端展示规则</h3><div class="inset" style="padding:18px"><p><b>当前服务有效期至 2026-05-31</b></p><p class="muted" style="margin-top:8px">不展示余额、欠费金额、班级毛利、老师课费或机构收入。</p></div><div class="inset" style="padding:18px;margin-top:14px"><p><b>服务即将到期，请联系机构续费</b></p><p class="muted" style="margin-top:8px">到期前一次、到期当天一次；逾期后由后台手动提醒。</p></div></div>
    </div>
  `);
}

function adminAiLog() {
  return adminShell("AI日志", `
    <div class="between"><div><h1 class="title">AI 操作日志与权限审计</h1><div class="sub">所有写入动作需确认，高风险操作只引导传统页面</div></div><div class="row"><div class="pill">全部校区</div><div class="pill">风险等级</div></div></div>
    <div class="soft panel" style="margin-top:18px"><table><tr><th>时间</th><th>校区</th><th>用户</th><th>原始输入</th><th>意图</th><th>风险</th><th>结果</th></tr>${[["14:32","阳光校区","林女士","明天下午请半天假","createLeaveRequest","中风险","确认后成功"],["14:18","城南校区","李老师","王小雨数学已完成","recordHomeworkFeedback","中风险","确认后成功"],["13:55","总校","张校长","把陈一诺转到星河校区","transferCampus","高风险","拒绝并引导"],["13:22","星河校区","校区管理员","查询本校区到期名单","queryBilling","低风险","成功"],["12:40","家长","王女士","今天作业完成了吗","queryHomework","低风险","返回原图/批改图/点评"]].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td><span class="tag ${r[5]==="高风险"?"danger":r[5]==="中风险"?"warn":"ok"}">${r[5]}</span></td><td>${r[6]}</td></tr>`).join("")}</table></div>
    <div style="margin-top:18px">${metrics([["今日 AI 处理","142","查询 96 / 写入 40 / 拒绝 6"],["跨校区审计","6","全部进入传统页面"],["确认完成率","95.1%","中风险动作留痕"],["家长作业查询","48","返回图片和点评摘要"]])}</div>
  `);
}

function teacherShell(title, inner) {
  return html(`<div class="page teacher"><div class="teacherTop"><div class="brand"><div class="logo">师</div><div>${title}</div></div><div class="row"><div class="pill">阳光校区</div><div class="pill">三年级(2)班</div><div class="btn primary">李老师</div></div></div>${inner}</div>`, "tablet");
}

function teacherToday() {
  return teacherShell("今日托管工作台", `<div class="teacherGrid">
    <div class="soft panel"><h3>今日流程</h3>${["到岗签到 13:40","拍照签到 14:00","作业辅导 16:00","批改反馈 17:10","离托交接 18:00"].map((x,i)=>`<div class="row" style="margin:18px 0"><div class="logo" style="width:34px;height:34px;border-radius:50%">${i+1}</div><div><b>${x.split(" ")[0]}</b><p class="muted small">${x.split(" ")[1]}</p></div></div>`).join("")}<div class="btn primary" style="width:100%">老师到岗签到</div></div>
    <div class="soft panel"><h3>学生状态</h3>${[["王小雨","已到托","作业待批改","服务正常"],["陈一诺","已到托","语文未完成","欠费提醒"],["张一诺","待确认","请假待确认","服务正常"],["周雨桐","已到托","已发布反馈","服务正常"],["赵天宇","已到托","错题待收录","7天到期"]].map(r=>`<div class="studentRow"><div class="avatar">${r[0][0]}</div><div><b>${r[0]}</b><p class="muted small">${r[2]}</p></div><span class="tag ${r[1]==="已到托"?"ok":r[1]==="待确认"?"warn":""}">${r[1]}</span><span class="tag ${r[3].includes("欠")?"danger":r[3].includes("到期")?"warn":"ok"}">${r[3]}</span></div>`).join("")}</div>
    <div class="soft panel"><h3>今日提醒</h3><div class="inset" style="padding:16px"><b>服务到期/欠费</b><p class="muted">陈一诺欠费提醒，赵天宇 7 天到期。老师端可见提醒，不显示班级毛利。</p></div><div class="inset" style="padding:16px;margin-top:14px"><b>作业反馈</b><p class="muted">3 人缺少批改图，发布前需确认原图、批改图和三类点评。</p></div><div class="btn primary" style="width:100%;margin-top:16px">进入拍照批改</div></div>
  </div>`);
}

function teacherAiEntry() {
  return teacherShell("AI 快捷录入", `<div class="grid" style="grid-template-columns:1fr 1fr 360px;height:calc(100% - 84px)">
    <div class="soft panel"><h3>语音/文字输入</h3><div class="inset" style="height:250px;padding:26px;text-align:center"><div style="font-size:76px;color:${theme.purple};margin-top:30px">●</div><h2>正在识别 00:08</h2><p class="muted">“王小雨数学完成，陈一诺语文错两题，明天请家长关注。”</p></div><div class="inset" style="padding:16px;margin-top:18px">王小雨数学完成，陈一诺语文错两题，明天请家长关注。</div></div>
    <div class="soft panel"><h3>识别结果</h3>${[["王小雨","作业反馈","数学完成","96%"],["陈一诺","错题收录","语文错两题","91%"],["家长提醒","反馈草稿","关注语文订正","88%"]].map(r=>`<div class="inset" style="padding:16px;margin-bottom:14px"><div class="between"><b>${r[0]}</b><span class="tag ok">${r[3]}</span></div><p class="muted">${r[1]} · ${r[2]}</p><div class="row" style="margin-top:12px"><div class="btn">编辑</div><div class="btn">忽略</div></div></div>`).join("")}<div class="btn primary" style="width:100%">确认写入</div></div>
    <div class="soft panel"><h3>写入确认</h3><p class="muted">作业反馈、批改确认、练习单生成均为中风险写入动作，必须由老师确认。</p><div class="tag warn" style="margin-top:18px">中风险</div><div class="inset" style="padding:16px;margin-top:18px">写入后将同步到作业反馈、错题本和 AI 操作日志。</div></div>
  </div>`);
}

function teacherHomeworkFeedback() {
  return teacherShell("作业批改与反馈", `<div class="grid" style="grid-template-columns:1fr 410px;height:calc(100% - 84px)">
    <div class="soft panel"><div class="between"><h3>王小雨 · 数学作业</h3><div class="row"><div class="btn">上传原图</div><div class="btn primary">发布给家长</div></div></div><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:14px"><div><div class="homeworkImg"></div><p class="muted small" style="margin-top:10px">作业原图：真实反映书写和完成状态</p></div><div><div class="homeworkImg"><div class="markWrong" style="left:38%;top:30%;width:140px;height:80px"></div><div class="markWrong" style="left:16%;top:62%;width:110px;height:56px"></div></div><p class="muted small" style="margin-top:10px">批改图：老师确认后的圈错区域</p></div></div><table style="margin-top:18px"><tr><th>题号</th><th>AI建议</th><th>老师确认</th><th>收录错题本</th></tr><tr><td>第 3 题</td><td>单位换算错误</td><td><span class="tag ok">已确认</span></td><td>是</td></tr><tr><td>第 6 题</td><td>计算漏进位</td><td><span class="tag ok">已确认</span></td><td>是</td></tr></table></div>
    <div class="soft panel"><h3>三类点评</h3>${[["行为表现","专注度不错，能主动询问不会的题目。"],["作业完成","数学已完成，书写较工整，个别题目需要订正。"],["知识掌握","单位换算和进位计算还需巩固，已收录错题本。"]].map(r=>`<div class="inset" style="padding:16px;margin-bottom:14px"><b>${r[0]}</b><p class="muted" style="margin-top:8px">${r[1]}</p></div>`).join("")}<div class="btn primary" style="width:100%">确认发布反馈</div></div>
  </div>`);
}

function phoneShell(active, inner) {
  return html(`<div class="page phone"><div class="status"><span>9:41</span><span>5G 100%</span></div>${inner}<div class="bottomNav">${["首页","作业","AI","通知","我的"].map(n=>`<div class="${n===active?"on":""}">●<br>${n}</div>`).join("")}</div></div>`, "mobile");
}

function parentHome() {
  return phoneShell("首页", `<div class="between"><div><div class="mobileTitle">晚上好，王女士</div><div class="mobileSub">王小雨 · 阳光校区 · 晚全托</div></div><div class="logo">雨</div></div><div class="mcard" style="margin-top:28px"><div class="between"><div><b style="font-size:26px">已到托管中心</b><p class="muted">14:05 · 李老师拍照签到</p></div><span class="tag ok">已通知</span></div><div class="homeworkImg" style="height:170px;margin-top:18px"></div></div><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:18px"><div class="mcard"><div class="label">作业反馈</div><div class="num">已发布</div><p class="muted">含原图、批改图、三类点评</p></div><div class="mcard"><div class="label">服务有效期</div><div class="num" style="font-size:24px">05-31</div><p class="muted">不显示余额</p></div></div><div class="mcard" style="margin-top:18px"><h3>今日点评摘要</h3><p style="margin-top:12px"><span class="tag">行为表现</span> 专注度不错</p><p style="margin-top:10px"><span class="tag purple">作业完成</span> 数学已完成，英语需复习</p><p style="margin-top:10px"><span class="tag ok">知识掌握</span> 单位换算需巩固</p></div>`);
}

function parentAiLeave() {
  return phoneShell("AI", `<div class="mobileTitle">AI 家校助手</div><div class="mobileSub">可查状态、作业、请假、留言和服务有效期</div><div class="mcard" style="margin-top:26px"><p class="muted">你可以这样问：</p><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:16px"><div class="btn">孩子到托了吗</div><div class="btn">今天作业如何</div><div class="btn">明天请假</div><div class="btn">什么时候到期</div></div></div><div class="mcard" style="margin-top:18px"><h3>请假确认卡片</h3><p style="margin-top:12px"><b>学生：</b>王小雨</p><p><b>时间：</b>2026-05-02 下午</p><p><b>类型：</b>半天假，不影响晚辅导</p><p><b>原因：</b>家里有事</p><div class="row" style="margin-top:18px"><div class="btn primary" style="flex:1">确认提交</div><div class="btn" style="flex:1">修改</div></div></div><div class="mcard" style="margin-top:18px"><h3>服务查询结果</h3><p class="muted">当前服务有效期至 2026-05-31。家长端不展示余额或欠费金额。</p></div>`);
}

function parentHomeworkAttendance() {
  return phoneShell("作业", `<div class="mobileTitle">作业与考勤详情</div><div class="mobileSub">真实查看孩子作业状态</div><div class="mcard" style="margin-top:24px"><div class="between"><h3>数学作业 · 已发布</h3><span class="tag ok">老师确认</span></div><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:16px"><div><div class="homeworkImg"></div><p class="muted small" style="margin-top:8px">作业原图</p></div><div><div class="homeworkImg"><div class="markWrong" style="left:38%;top:30%;width:110px;height:66px"></div><div class="markWrong" style="left:18%;top:62%;width:92px;height:50px"></div></div><p class="muted small" style="margin-top:8px">批改图片</p></div></div></div><div class="mcard" style="margin-top:18px"><h3>总结性点评</h3>${[["行为表现","今天较专注，遇到不懂会主动提问。"],["作业完成","数学完成，英语单词还需复习。"],["知识掌握","单位换算和进位计算需要继续练习。"]].map(r=>`<p style="margin-top:12px"><span class="tag purple">${r[0]}</span> ${r[1]}</p>`).join("")}</div><div class="mcard" style="margin-top:18px"><h3>考勤记录</h3><p>14:05 已到托管中心 · 李老师拍照签到</p><p class="muted">到托照片仅自己孩子家长可见。</p></div>`);
}

function parentProfile() {
  return phoneShell("我的", `<div class="mobileTitle">我的/服务信息</div><div class="mobileSub">孩子资料、通知设置、服务有效期</div><div class="mcard" style="margin-top:24px"><div class="between"><div><h3>王小雨</h3><p class="muted">阳光校区 · 三年级(2)班 · 晚全托</p></div><div class="logo">雨</div></div><p style="margin-top:16px">身份证号：3201**********1234</p><p class="muted">默认脱敏展示，仅用于研学、保险和实名出行。</p></div><div class="mcard" style="margin-top:18px"><h3>服务信息</h3><p style="margin-top:12px">当前服务有效期至 2026-05-31</p><p class="muted">不展示余额、欠费金额、机构收入或老师课费。</p></div><div class="mcard" style="margin-top:18px"><h3>消息设置</h3><p>到托通知：开启</p><p>作业反馈：开启</p><p>服务到期提醒：低频提醒</p></div>`);
}

function studentShell(active, inner) {
  return html(`<div class="page phone" style="background:linear-gradient(180deg,#EAF1F7,#F5F0FA,#EDF8F2)"><div class="status"><span>9:41</span><span>Pad 100%</span></div>${inner}<div class="bottomNav">${["任务","错题","练习","奖励","我的"].map(n=>`<div class="${n===active?"on":""}">●<br>${n}</div>`).join("")}</div></div>`, "student");
}

function studentToday() {
  return studentShell("任务", `<div class="between"><div><div class="mobileTitle">王小雨的今日任务</div><div class="mobileSub">完成 3/5 项，再得 2 颗星</div></div><div class="logo">星</div></div><div class="mcard" style="margin-top:26px"><h3>学习进度</h3><div class="inset" style="height:28px;margin-top:16px;overflow:hidden"><div style="height:100%;width:68%;border-radius:999px;background:linear-gradient(90deg,${theme.mint},${theme.purple})"></div></div></div><div class="grid" style="margin-top:18px">${[["数学口算","已完成","ok"],["语文阅读","进行中","warn"],["英语单词","待完成",""],["错题订正","2 道待订正","purple"]].map(r=>`<div class="mcard"><div class="between"><h3>${r[0]}</h3><span class="tag ${r[2]}">${r[1]}</span></div><p class="muted" style="margin-top:8px">完成后老师会给出鼓励和反馈。</p></div>`).join("")}</div>`);
}

function studentLearning() {
  return studentShell("错题", `<div class="mobileTitle">错题本/学习入口</div><div class="mobileSub">老师确认后的错题会自动收录</div><div class="mcard" style="margin-top:24px"><h3>今日错题</h3><div class="homeworkImg" style="margin-top:16px"><div class="markWrong" style="left:36%;top:30%;width:130px;height:76px"></div></div><p style="margin-top:14px"><b>知识点：</b>单位换算</p><p class="muted">AI 已生成 3 道同类题，等待老师选择后布置。</p></div><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:18px"><div class="mcard"><h3>举一反三</h3><p class="muted">老师布置后练习</p></div><div class="mcard"><h3>拍照提问</h3><p class="muted">未来扩展入口</p></div></div>`);
}

function loginRoleSwitch() {
  return html(`<div class="page login"><section class="loginHero"><div class="brand"><div class="logo">晚</div><div>晚辅托管系统</div></div><h1 style="margin-top:90px">Serenity-Neumorphic<br>多校区托管运营</h1><p class="mobileSub" style="max-width:560px">校区管理、拍照签到、作业原图与批改图反馈、三类点评、错题本、低频续费提醒和 AI 确认闭环。</p></section><section class="soft loginPanel"><h2 style="font-size:32px">选择角色登录</h2><p class="muted" style="margin-top:8px">不同角色进入不同终端，数据按校区和孩子绑定关系隔离。</p><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:28px">${[["校长/管理员","多校区看板、收费核算、AI日志"],["老师","今日托管、拍照批改、三类点评"],["家长","到托通知、作业原图、批改图"],["学生","今日任务、错题复习"]].map((r,i)=>`<div class="${i===0?"inset":"soft"}" style="padding:18px"><h3>${r[0]}</h3><p class="muted small" style="margin-top:8px">${r[1]}</p></div>`).join("")}</div><div class="inset" style="margin-top:24px;padding:14px">手机号 / 账号</div><div class="inset" style="margin-top:14px;padding:14px">密码 / 验证码</div><div class="btn primary" style="width:100%;margin-top:24px;height:54px">登录系统</div></section></div>`, "login");
}

function overviewBoard() {
  const labels = ["管理总览","校区学生","考勤作业","收费核算","AI日志","老师工作台","老师AI录入","作业批改","家长首页","家长AI","作业详情","我的服务","学生任务","学生错题","角色登录","设计规范"];
  return html(`<div class="page overview">${labels.map((label,i)=>`<div class="soft mini"><h3>${String(i).padStart(2,"0")} ${label}</h3><div class="fakeBox"></div><div class="fakeLine" style="width:90%"></div><div class="fakeLine" style="width:70%"></div><div class="row" style="margin-top:10px"><span class="tag ${i%3===0?"purple":i%3===1?"ok":"warn"}">${i<5?"管理":i<8?"老师":i<12?"家长":i<14?"学生":"入口"}</span><span class="tag">Serenity</span></div></div>`).join("")}</div>`, "overview");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const chromePath = fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : undefined;
  const browser = await chromium.launch(chromePath ? { executablePath: chromePath } : {});
  for (const [name, type, render] of pages) {
    const page = await browser.newPage({ viewport: viewports[type], deviceScaleFactor: 1 });
    await page.setContent(render(), { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: false });
    await page.close();
    console.log(`generated ${name}`);
  }
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
