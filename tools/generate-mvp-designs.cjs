const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = "D:\\Projects\\AfterClass\\设计稿";

const schemes = [
  {
    dir: "方案1-蓝白专业",
    name: "蓝白专业",
    primary: "#2563eb",
    primaryDark: "#082f63",
    accent: "#14b8a6",
    warn: "#f59e0b",
    danger: "#ef4444",
    bg: "#f8fafc",
    soft: "#eaf2ff",
    studentBg: "linear-gradient(180deg,#dbeafe 0%,#f8fbff 45%,#ecfdf5 100%)",
  },
  {
    dir: "方案2-青绿清爽",
    name: "青绿清爽",
    primary: "#0f766e",
    primaryDark: "#064e3b",
    accent: "#22c55e",
    warn: "#f97316",
    danger: "#dc2626",
    bg: "#f6fffb",
    soft: "#dffbf0",
    studentBg: "linear-gradient(180deg,#ccfbf1 0%,#f0fdf4 55%,#fefce8 100%)",
  },
  {
    dir: "方案3-靛蓝橙活力",
    name: "靛蓝橙活力",
    primary: "#4f46e5",
    primaryDark: "#312e81",
    accent: "#f97316",
    warn: "#f59e0b",
    danger: "#e11d48",
    bg: "#f8f7ff",
    soft: "#ede9fe",
    studentBg: "linear-gradient(180deg,#eef2ff 0%,#fff7ed 60%,#fef3c7 100%)",
  },
  {
    dir: "方案4-墨蓝薄荷",
    name: "墨蓝薄荷",
    primary: "#0f3a5f",
    primaryDark: "#061b2d",
    accent: "#2dd4bf",
    warn: "#f59e0b",
    danger: "#f43f5e",
    bg: "#f4f9fb",
    soft: "#dff7f2",
    studentBg: "linear-gradient(180deg,#e0f2fe 0%,#ecfeff 48%,#dcfce7 100%)",
  },
  {
    dir: "方案5-暖白科技蓝",
    name: "暖白科技蓝",
    primary: "#1d4ed8",
    primaryDark: "#172554",
    accent: "#06b6d4",
    warn: "#ea580c",
    danger: "#dc2626",
    bg: "#fffaf3",
    soft: "#e0f2fe",
    studentBg: "linear-gradient(180deg,#eff6ff 0%,#fff7ed 58%,#f0f9ff 100%)",
  },
  {
    dir: "UIUX-ProMax-重设计版",
    name: "UIUX Pro Max",
    primary: "#1E40AF",
    primaryDark: "#0F172A",
    accent: "#D97706",
    warn: "#D97706",
    danger: "#DC2626",
    bg: "#F8FAFC",
    soft: "#E9EEF6",
    studentBg: "linear-gradient(180deg,#EEF2FF 0%,#FFFFFF 48%,#FFF7D6 100%)",
  },
  {
    dir: "Serenity-Neumorphic-重设计版",
    name: "Serenity Neumorphic",
    style: "serenity",
    primary: "#86A9BB",
    primaryDark: "#516173",
    accent: "#8B5CF6",
    warn: "#D97706",
    danger: "#EF5350",
    bg: "#EAF1F7",
    soft: "#EEF4FA",
    studentBg: "linear-gradient(180deg,#EAF1F7 0%,#F3EEF8 52%,#EDF6F0 100%)",
  },
];

const pages = [
  ["01-admin-dashboard.png", "admin", adminDashboard],
  ["02-admin-students-classes.png", "admin", adminStudentsClasses],
  ["03-admin-attendance-homework.png", "admin", adminAttendanceHomework],
  ["04-admin-billing-notices.png", "admin", adminBillingNotices],
  ["05-admin-ai-log.png", "admin", adminAiLog],
  ["06-teacher-today.png", "teacher", teacherToday],
  ["07-teacher-ai-quick-entry.png", "teacher", teacherAiQuickEntry],
  ["08-teacher-homework-feedback.png", "teacher", teacherHomeworkFeedback],
  ["09-parent-home.png", "mobile", parentHome],
  ["10-parent-ai-assistant-leave.png", "mobile", parentAiAssistantLeave],
  ["11-parent-homework-attendance-billing.png", "mobile", parentHomeworkAttendanceBilling],
  ["12-parent-profile-notices.png", "mobile", parentProfileNotices],
  ["13-student-today-task.png", "student", studentTodayTask],
  ["14-student-learning-homework.png", "student", studentLearningHomework],
  ["15-login-role-switch.png", "login", loginRoleSwitch],
  ["00-overview-board.png", "overview", overviewBoard],
];

const viewports = {
  admin: { width: 1488, height: 1058 },
  teacher: { width: 1504, height: 1046 },
  mobile: { width: 853, height: 1844 },
  student: { width: 1086, height: 1680 },
  login: { width: 1200, height: 900 },
  overview: { width: 1536, height: 1024 },
};

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function baseCss(t, type) {
  const serenity = t.style === "serenity";
  return `
  *{box-sizing:border-box} body{margin:0;font-family:${serenity ? '"Plus Jakarta Sans",' : ""}"Inter","Microsoft YaHei","PingFang SC",Arial,sans-serif;color:${serenity ? "#2F3A4A" : "#111827"};background:${t.bg};letter-spacing:0}
  .page{width:100vw;height:100vh;overflow:hidden;background:${t.bg}}
  .shell{display:flex;width:100%;height:100%}.side{width:212px;background:${serenity ? t.bg : `linear-gradient(180deg,${t.primaryDark},#03192f)`};color:${serenity ? "#3B4658" : "white"};padding:24px 14px;display:flex;flex-direction:column;gap:22px;${serenity ? "box-shadow: 10px 0 24px rgba(115,133,151,.14);" : ""}}
  .brand{display:flex;align-items:center;gap:10px;font-size:26px;font-weight:800}.mark{width:36px;height:36px;border-radius:${serenity ? "14px" : "10px"};background:${serenity ? t.bg : "white"};color:${t.primary};display:grid;place-items:center;font-weight:900;${serenity ? "box-shadow:-6px -6px 14px rgba(255,255,255,.85),6px 6px 14px rgba(120,139,158,.22);" : ""}}
  .nav{display:flex;flex-direction:column;gap:9px}.nav div{height:42px;display:flex;align-items:center;gap:10px;padding:0 14px;border-radius:${serenity ? "999px" : "8px"};font-size:15px;color:${serenity ? "#667489" : "#dbeafe"}}.nav .active{background:${serenity ? t.bg : t.primary};color:${serenity ? "#2F3A4A" : "white"};${serenity ? "box-shadow: inset 5px 5px 10px rgba(120,139,158,.20), inset -5px -5px 10px rgba(255,255,255,.8);" : ""}}
  .sideFoot{margin-top:auto;background:${serenity ? t.bg : "rgba(255,255,255,.09)"};border:${serenity ? "0" : "1px solid rgba(255,255,255,.14)"};border-radius:${serenity ? "18px" : "10px"};padding:14px;font-size:14px;line-height:1.7;${serenity ? "box-shadow:-7px -7px 16px rgba(255,255,255,.8),7px 7px 16px rgba(120,139,158,.20);" : ""}}
  .main{flex:1;display:flex;flex-direction:column;min-width:0}.top{height:72px;background:${serenity ? t.bg : "#fff"};border-bottom:${serenity ? "0" : "1px solid #e5e7eb"};display:flex;align-items:center;gap:18px;padding:0 28px}
  .select,.search,.btn,.input{height:40px;border:${serenity ? "0" : "1px solid #dbe3ef"};background:${serenity ? t.bg : "white"};border-radius:${serenity ? "999px" : "8px"};padding:0 14px;display:flex;align-items:center;gap:8px;color:#334155;font-size:14px;${serenity ? "box-shadow: inset 3px 3px 8px rgba(120,139,158,.16), inset -3px -3px 8px rgba(255,255,255,.85);" : ""}}.search{width:360px;margin-left:auto}.btn.primary{background:${t.primary};border-color:${t.primary};color:white;${serenity ? "box-shadow:6px 6px 14px rgba(120,139,158,.22),-6px -6px 14px rgba(255,255,255,.75);" : ""}}.btn.ghost{background:#fff}
  .content{padding:24px 28px;overflow:hidden;flex:1}.title{font-size:28px;font-weight:800;margin:0 0 6px}.sub{color:#64748b;font-size:14px}.row{display:flex;gap:16px}.grid{display:grid;gap:16px}.cards{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}.card{background:white;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,.04)}
  ${serenity ? `.card{background:${t.bg};border:0;border-radius:22px;box-shadow:-10px -10px 24px rgba(255,255,255,.82),10px 10px 24px rgba(120,139,158,.20)}.mCard{background:${t.bg}!important;border:0!important;box-shadow:-10px -10px 24px rgba(255,255,255,.82),10px 10px 24px rgba(120,139,158,.20)!important}.panel h3{color:#2F3A4A}.title{color:#273142}.sub{color:#75849A}` : ""}
  .metric{padding:18px}.metric .label{color:#64748b;font-size:13px}.metric .num{font-size:28px;font-weight:800;margin-top:8px}.up{color:#10b981}.down{color:${t.danger}}.warn{color:${t.warn}}.ok{color:#10b981}.danger{color:${t.danger}}
  .panel{padding:18px}.panel h3{margin:0 0 14px;font-size:17px}.table{width:100%;border-collapse:collapse;font-size:14px}.table th{color:#64748b;text-align:left;font-weight:600;background:#f8fafc}.table th,.table td{padding:12px;border-bottom:1px solid #eef2f7}.tag{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:12px;background:${t.soft};color:${t.primary};font-weight:700}.tag.ok{background:#dcfce7;color:#15803d}.tag.warn{background:#fff7ed;color:#c2410c}.tag.danger{background:#fee2e2;color:#b91c1c}
  .chart{height:210px;border-radius:8px;background:linear-gradient(180deg,#fff,#f8fafc);position:relative;border:1px solid #eef2f7;overflow:hidden}.chart:before{content:"";position:absolute;inset:24px;background:repeating-linear-gradient(to right,transparent 0 74px,#e5e7eb 75px),repeating-linear-gradient(to bottom,transparent 0 42px,#e5e7eb 43px)}
  .line{position:absolute;left:34px;right:24px;bottom:56px;height:74px;border-bottom:4px solid ${t.primary};border-radius:50%;transform:skewY(-8deg)}.bars{display:flex;align-items:end;gap:16px;position:absolute;bottom:30px;left:36px;right:36px;height:145px}.bars i{flex:1;background:${t.primary};border-radius:6px 6px 0 0}.bars i:nth-child(2n){background:${t.accent}}.bars i:nth-child(3n){background:${t.warn}}
  .donut{width:130px;height:130px;border-radius:50%;background:conic-gradient(${t.primary} 0 58%,${t.accent} 58% 84%,${t.warn} 84% 94%,#e5e7eb 94%);display:grid;place-items:center}.donut span{width:82px;height:82px;border-radius:50%;background:white;display:grid;place-items:center;font-weight:800}
  .phone{width:100%;height:100vh;background:${type==="student"?t.studentBg:serenity?t.bg:"linear-gradient(180deg,#f8fbff,#ffffff)"};padding:54px 34px 24px;position:relative;overflow:hidden}.status{height:30px;display:flex;justify-content:space-between;font-size:24px;font-weight:800;margin-bottom:34px}.mobileTitle{font-size:34px;font-weight:800}.mobileSub{font-size:21px;color:#64748b;margin-top:10px}.mCard{background:rgba(255,255,255,.88);border:1px solid #e5e7eb;border-radius:${serenity ? "28px" : "24px"};box-shadow:0 12px 30px rgba(15,23,42,.06);padding:24px}.bottomNav{position:absolute;left:30px;right:30px;bottom:24px;height:96px;border-radius:36px;background:${serenity ? t.bg : "white"};box-shadow:${serenity ? "-8px -8px 20px rgba(255,255,255,.85),8px 8px 20px rgba(120,139,158,.22)" : "0 -8px 28px rgba(15,23,42,.08)"};display:grid;grid-template-columns:repeat(5,1fr);align-items:center;text-align:center;color:#64748b;font-size:17px}.bottomNav .on{color:${t.primary};font-weight:800}.bigBtn{height:58px;border-radius:${serenity ? "999px" : "16px"};background:${t.primary};color:white;display:grid;place-items:center;font-size:20px;font-weight:800;${serenity ? "box-shadow:6px 6px 14px rgba(120,139,158,.24),-6px -6px 14px rgba(255,255,255,.8);" : ""}}.outlineBtn{height:52px;border:${serenity ? "0" : "1px solid #dbe3ef"};border-radius:${serenity ? "999px" : "14px"};background:${serenity ? t.bg : "white"};color:${t.primary};display:grid;place-items:center;font-size:18px;font-weight:700;${serenity ? "box-shadow:inset 4px 4px 9px rgba(120,139,158,.16),inset -4px -4px 9px rgba(255,255,255,.85);" : ""}}
  .teacherShell{width:100%;height:100%;background:#fbfdff}.teacherTop{height:78px;background:white;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;padding:0 30px}.teacherBody{padding:22px;display:grid;grid-template-columns:350px 1fr 420px;gap:18px}.flowItem{display:grid;grid-template-columns:46px 1fr;gap:14px;margin-bottom:18px}.dot{width:36px;height:36px;border-radius:50%;background:${t.soft};color:${t.primary};display:grid;place-items:center;font-weight:900}.studentRow{display:grid;grid-template-columns:52px 1.3fr 1fr 1fr 50px;align-items:center;gap:12px;padding:14px;border-bottom:1px solid #eef2f7}.avatar{width:44px;height:44px;border-radius:50%;background:${t.primary};color:white;display:grid;place-items:center;font-weight:800}
  .aiBox{border:1px solid ${t.primary};background:linear-gradient(180deg,${t.soft},#fff);border-radius:14px;padding:18px}.mic{width:112px;height:112px;border-radius:50%;background:${t.primary};color:white;display:grid;place-items:center;font-size:42px;margin:16px auto}.wave{height:34px;background:repeating-linear-gradient(90deg,${t.primary} 0 4px,transparent 4px 14px);opacity:.55;border-radius:10px}
  .loginWrap{width:100%;height:100%;display:grid;grid-template-columns:1.1fr .9fr;background:linear-gradient(135deg,${t.primaryDark},${t.primary} 52%,${t.accent})}.loginHero{color:white;padding:74px}.loginHero h1{font-size:54px;margin:0 0 22px}.loginPanel{margin:70px;background:white;border-radius:24px;padding:36px;box-shadow:0 30px 80px rgba(0,0,0,.18)}.roleGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.role{border:1px solid #e5e7eb;border-radius:16px;padding:18px}.role.active{border-color:${t.primary};background:${t.soft}}
  .overview{padding:20px;background:${t.bg};height:100%;display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:14px}.mini{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:16px;overflow:hidden}.mini h2{font-size:18px;margin:0 0 10px}.mini .fake{height:100%;border-radius:12px;background:linear-gradient(135deg,${t.soft},#fff);padding:12px}
  `;
}

function doc(t, body, type = "admin") {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss(t, type)}</style></head><body>${body}</body></html>`;
}

const adminNav = ["首页总览", "学生管理", "班级管理", "考勤签到", "作业反馈", "收费账单", "AI运营助手", "家校通知", "数据报表", "系统设置"];
function adminShell(t, active, inner) {
  return `<div class="page shell"><aside class="side"><div class="brand"><div class="mark">智</div><div>智托管AI</div></div><div class="nav">${adminNav.map((n) => `<div class="${n === active ? "active" : ""}">▣ ${n}</div>`).join("")}</div><div class="sideFoot"><b>阳光小学（总校区）</b><br>2024-2025 第二学期<br><span style="color:#bfdbfe">在线客服 · 切换校区</span></div></aside><main class="main"><div class="top"><div class="select">阳光小学（总校区）⌄</div><div class="select">2024-05-15</div><div class="search">搜索学生、班级、功能或报表</div><div class="btn">🔔 12</div><div class="btn">张校长 ⌄</div></div><section class="content">${inner}</section></main></div>`;
}

function adminDashboard(t) {
  const metrics = [["今日到托人数", "362 人", "较昨日 +18", "up"], ["出勤率", "92.6%", "较昨日 +2.4%", "up"], ["待处理请假", "8 条", "较昨日 -2", "warn"], ["今日应收金额", "¥58,620", "较昨日 +¥5,860", "down"], ["作业完成率", "86.4%", "较昨日 +3.6%", "up"], ["AI处理事项", "126 条", "已处理 118 条", ""]];
  return doc(t, adminShell(t, "首页总览", `<div class="row" style="justify-content:space-between;align-items:end"><div><h1 class="title">运营总览</h1><div class="sub">数据更新时间：2024-05-15 14:30</div></div><div class="row"><div class="btn">自定义看板</div><div class="btn primary">导出数据</div></div></div><div class="cards" style="margin-top:22px">${metrics.map((m) => `<div class="card metric"><div class="label">${m[0]}</div><div class="num">${m[1]}</div><div class="${m[3]}">${m[2]}</div></div>`).join("")}</div><div class="grid" style="grid-template-columns:1.1fr 1.15fr .9fr;margin-top:18px"><div class="card panel"><h3>本周到托出勤趋势</h3><div class="chart"><div class="line"></div></div></div><div class="card panel"><h3>本周课后服务收入趋势</h3><div class="chart"><div class="bars"><i style="height:82%"></i><i style="height:62%"></i><i style="height:70%"></i><i style="height:58%"></i><i style="height:86%"></i><i style="height:77%"></i><i style="height:91%"></i></div></div></div><div class="card panel"><h3>风险预警</h3>${["3名学生连续3天未到托","12名学生余额不足（<50元）","5份作业超过2天未反馈","2名学生请假未审批"].map((x, i) => `<p><span class="tag ${i === 0 ? "danger" : i < 3 ? "warn" : ""}">${i === 0 ? "紧急" : i < 3 ? "提醒" : "一般"}</span> ${x}</p>`).join("")}</div></div><div class="grid" style="grid-template-columns:1.1fr .9fr .8fr;margin-top:18px"><div class="card panel"><h3>班级运营状态</h3>${classTable()}</div><div class="card panel"><h3>AI 智能洞察</h3>${insights(t)}</div><div class="card panel"><h3>近期操作日志</h3>${logList()}</div></div>`));
}

function classTable() {
  return `<table class="table"><tr><th>班级</th><th>在托</th><th>出勤</th><th>作业</th><th>待反馈</th><th>操作</th></tr>${["三年级(1)班,45,93.3%,88.9%,3","三年级(2)班,43,95.3%,85.2%,5","四年级(1)班,46,87.0%,82.6%,6","四年级(2)班,44,95.5%,90.2%,2","五年级(1)班,42,95.2%,87.5%,4"].map((r) => { const a = r.split(","); return `<tr><td>${a[0]}</td><td>${a[1]}</td><td class="${a[2].startsWith("87") ? "danger" : "ok"}">${a[2]}</td><td>${a[3]}</td><td class="warn">${a[4]}</td><td style="color:#2563eb">详情</td></tr>`; }).join("")}</table>`;
}

function insights(t) {
  return ["本周出勤率较上周提升 2.4%，整体运营良好", "三年级作业完成率偏低，建议关注作业难度与反馈时效", "12 名学生有欠费风险，预计金额 ¥3,240", "AI 本周已处理 126 条事项，节省 8.5 小时"].map((x, i) => `<div style="display:flex;gap:12px;padding:12px;border-bottom:1px solid #eef2f7"><div class="dot">${i + 1}</div><div>${x}<br><span class="tag">${["运营表现", "作业分析", "财务风险", "AI效率"][i]}</span></div></div>`).join("");
}

function logList() {
  return ["李老师 批改了作业《数学练习册 P.45》", "系统 发送了缴费提醒给 32 位家长", "王老师 审批通过学生请假申请（3条）", "系统 生成了每日运营摘要"].map((x, i) => `<p style="display:flex;justify-content:space-between;border-bottom:1px solid #eef2f7;padding-bottom:10px"><span>${x}</span><span class="sub">14:${28 - i * 7}</span></p>`).join("");
}

function adminStudentsClasses(t) {
  return doc(t, adminShell(t, "学生管理", `<h1 class="title">学生档案与班级管理</h1><div class="row" style="margin:16px 0"><div class="select">全部校区</div><div class="select">全部年级</div><div class="select">在读状态</div><div class="search" style="margin-left:0">输入姓名 / 学号 / 家长手机号</div><div class="btn primary">新增学生</div></div><div class="cards" style="grid-template-columns:repeat(4,1fr)">${[["学生总数","1,246"],["在线学生","1,198"],["已停读","28"],["本月新增","46"]].map(m=>`<div class="card metric"><div class="label">${m[0]}</div><div class="num">${m[1]}</div></div>`).join("")}</div><div class="grid" style="grid-template-columns:1.3fr .7fr;margin-top:18px"><div class="card panel"><h3>学生列表</h3><table class="table"><tr><th>学号</th><th>姓名</th><th>年级</th><th>班级</th><th>家长</th><th>状态</th><th>费用</th><th>操作</th></tr>${["2023001 李思源 三年级 (1)班 138****1123 在读 正常","2023002 王梓涵 三年级 (1)班 139****3344 在读 即将到期","2023003 张子轩 三年级 (2)班 138****5566 请假 正常","2023004 陈一诺 二年级 (1)班 137****6677 欠费 欠费¥280","2023005 刘宇辰 三年级 (1)班 136****8899 在读 正常"].map(r=>{const a=r.split(" ");return `<tr><td>${a[0]}</td><td>${a[1]}</td><td>${a[2]}</td><td>${a[3]}</td><td>${a[4]}</td><td><span class="tag ${a[5]==="欠费"?"danger":a[5]==="请假"?"warn":"ok"}">${a[5]}</span></td><td>${a.slice(6).join(" ")}</td><td style="color:${t.primary}">详情 / 分班</td></tr>`}).join("")}</table></div><div class="card panel"><h3>班级分配</h3>${["三年级(1)班 · 李老师 · 32人","三年级(2)班 · 王老师 · 31人","四年级(1)班 · 陈老师 · 34人"].map(x=>`<div class="mCard" style="border-radius:12px;margin-bottom:12px;box-shadow:none"><b>${x}</b><br><span class="sub">容量 36 人，今日出勤正常</span></div>`).join("")}<div class="btn primary">批量调整班级</div></div></div>`));
}

function adminAttendanceHomework(t) {
  return doc(t, adminShell(t, "考勤签到", `<h1 class="title">考勤与作业管理</h1><div class="grid" style="grid-template-columns:.9fr 1.1fr;margin-top:18px"><div class="card panel"><h3>今日考勤概览</h3><div class="cards" style="grid-template-columns:repeat(4,1fr)">${[["应到","362"],["已到","335"],["请假","18"],["缺勤","9"]].map(m=>`<div class="metric"><div class="label">${m[0]}</div><div class="num">${m[1]}</div></div>`).join("")}</div><table class="table"><tr><th>学生</th><th>班级</th><th>状态</th><th>时间</th><th>来源</th></tr>${["王小雨 三年级(2)班 已到 14:05 老师补签","李思涵 三年级(2)班 请假 -- 家长AI申请","张一诺 三年级(2)班 待确认 -- 请假待审","陈子轩 三年级(2)班 已到 14:02 手动签到"].map(r=>{const a=r.split(" ");return `<tr><td>${a[0]}</td><td>${a[1]}</td><td><span class="tag ${a[2]==="已到"?"ok":a[2]==="请假"?"warn":""}">${a[2]}</span></td><td>${a[3]}</td><td>${a.slice(4).join(" ")}</td></tr>`}).join("")}</table></div><div class="card panel"><h3>作业反馈追踪</h3><table class="table"><tr><th>学生</th><th>数学</th><th>语文</th><th>英语</th><th>老师点评</th><th>附件</th><th>发布</th></tr>${["李思源 完成 完成 待复习 计算题需巩固 2张 已发布","王梓涵 完成 部分完成 完成 阅读理解需订正 1张 草稿","张子轩 未完成 完成 完成 请假后补交 0张 未发布","刘宇辰 完成 完成 完成 表现优秀 3张 已发布"].map(r=>{const a=r.split(" ");return `<tr><td>${a[0]}</td><td>${a[1]}</td><td>${a[2]}</td><td>${a[3]}</td><td>${a[4]}</td><td>${a[5]}</td><td><span class="tag ${a[6]==="已发布"?"ok":a[6]==="草稿"?"warn":""}">${a[6]}</span></td></tr>`}).join("")}</table><div class="aiBox" style="margin-top:16px"><b>AI 草稿提醒</b><p>检测到 6 份作业反馈超过 2 小时未发布，建议老师优先处理三年级(2)班。</p><div class="btn primary" style="width:160px">查看待发布</div></div></div></div>`));
}

function adminBillingNotices(t) {
  return doc(t, adminShell(t, "收费账单", `<h1 class="title">财务收费与公告通知</h1><div class="cards" style="margin-top:18px;grid-template-columns:repeat(4,1fr)">${[["本月应收","¥328,560"],["本月实收","¥307,860"],["欠费金额","¥20,700"],["7天内到期","38人"]].map(m=>`<div class="card metric"><div class="label">${m[0]}</div><div class="num">${m[1]}</div></div>`).join("")}</div><div class="grid" style="grid-template-columns:1.1fr .9fr;margin-top:18px"><div class="card panel"><h3>收费记录</h3><table class="table"><tr><th>学生</th><th>班级</th><th>服务周期</th><th>应收</th><th>状态</th><th>操作</th></tr>${["李思源 三年级(1)班 05-01至05-31 ¥280 已缴费","陈一诺 二年级(1)班 05-01至05-31 ¥280 欠费","赵欣怡 四年级(2)班 05-16到期 ¥320 待续费","周雨桐 三年级(2)班 06-02到期 ¥300 正常"].map(r=>{const a=r.split(" ");return `<tr><td>${a[0]}</td><td>${a[1]}</td><td>${a[2]}</td><td>${a[3]}</td><td><span class="tag ${a[4]==="欠费"?"danger":a[4]==="待续费"?"warn":"ok"}">${a[4]}</span></td><td style="color:${t.primary}">详情 / 提醒</td></tr>`}).join("")}</table></div><div class="card panel"><h3>公告通知</h3>${["关于五一假期托管安排的通知","三年级课后阅读活动报名","本周安全接送提醒"].map((x,i)=>`<div class="mCard" style="border-radius:12px;margin-bottom:12px;box-shadow:none"><b>${x}</b><br><span class="sub">${i===0?"已置顶 · 已读率 92%":"草稿 · 待发送"}</span></div>`).join("")}<div class="aiBox"><b>AI 续费话术草稿</b><p>为 18 位即将到期学生生成提醒文案，发送前需人工确认。</p><div class="row"><div class="btn primary">预览确认</div><div class="btn">取消</div></div></div></div></div>`));
}

function adminAiLog(t) {
  return doc(t, adminShell(t, "AI运营助手", `<h1 class="title">AI 操作日志</h1><div class="row" style="margin:16px 0"><div class="select">今日</div><div class="select">全部角色</div><div class="select">风险等级</div><div class="select">执行状态</div><div class="search" style="margin-left:0">搜索学生 / 意图 / 原始输入</div></div><div class="card panel"><table class="table"><tr><th>时间</th><th>用户</th><th>角色</th><th>原始输入</th><th>识别意图</th><th>风险</th><th>确认</th><th>结果</th><th>失败原因</th></tr>${[
    ["14:32","林女士","家长","帮孩子明天下午请假","createLeaveRequest","中风险","已确认","成功","-"],
    ["14:18","李老师","老师","王小雨数学已完成，英语需复习","recordHomeworkFeedback","中风险","已确认","成功","-"],
    ["13:55","张校长","校长","删除停读学生陈一诺","deleteStudent","高风险","未执行","拒绝","需进入学生管理页操作"],
    ["13:22","系统","AI","生成欠费提醒名单","queryBilling","低风险","无需确认","成功","-"],
    ["12:40","王女士","家长","孩子今天作业完成了吗","queryHomework","低风险","无需确认","成功","-"],
  ].map(a=>`<tr><td>${a[0]}</td><td>${a[1]}</td><td>${a[2]}</td><td>${a[3]}</td><td>${a[4]}</td><td><span class="tag ${a[5]==="高风险"?"danger":a[5]==="中风险"?"warn":"ok"}">${a[5]}</span></td><td>${a[6]}</td><td>${a[7]}</td><td>${a[8]}</td></tr>`).join("")}</table></div><div class="grid" style="grid-template-columns:1fr 1fr 1fr;margin-top:18px"><div class="card panel"><h3>今日 AI 处理</h3><div class="num">126</div><span class="sub">查询 84 · 写入 36 · 拒绝 6</span></div><div class="card panel"><h3>高风险拦截</h3><div class="num danger">6</div><span class="sub">全部引导至传统页面</span></div><div class="card panel"><h3>确认完成率</h3><div class="num ok">94.8%</div><span class="sub">中风险动作已留痕</span></div></div>`));
}

function teacherBase(t, title, body) {
  return doc(t, `<div class="page teacherShell"><div class="teacherTop"><div class="brand" style="color:${t.primary}"><div class="mark" style="background:${t.primary};color:white">智</div><div>智托管AI</div></div><h1 style="font-size:30px;margin:0">${title}</h1><div class="row"><div class="select">三年级(2)班⌄</div><div class="select">2024年5月15日</div><div class="btn">李老师 ⌄</div></div></div>${body}</div>`, "teacher");
}

function teacherToday(t) {
  return teacherBase(t, "今日托管", `<div class="teacherBody"><div><div class="card panel"><h3>今日流程</h3>${["到校签到 · 14:00 · 进行中","点心时间 · 15:30 · 待开始","作业辅导 · 16:00 · 待开始","离托交接 · 17:30 · 待开始"].map((x,i)=>`<div class="flowItem"><div class="dot">${i+1}</div><div><b>${x.split(" · ")[0]}</b><br><span class="sub">${x.split(" · ").slice(1).join(" · ")}</span></div></div>`).join("")}</div><div class="card panel" style="margin-top:18px;border-color:${t.warn}"><h3 class="warn">待确认请假 2 人</h3><p>李思涵、张一诺家长申请请假，等待您确认。</p><div class="btn primary">去处理</div></div></div><div class="card panel"><h3>学生状态（共32人）</h3>${["王小雨 已到14:05 数学已完成 无异常","李思涵 请假 请假 家长申请请假","张一诺 待确认 -- 家长申请请假","陈子轩 已到14:02 语文进行中 无异常","刘梓涵 已到14:10 英语未完成 提醒背单词","赵天宇 已到14:12 数学需订正 粗心错误较多","周雨桐 已到14:08 全部完成 表现优秀"].map(r=>{const a=r.split(" ");return `<div class="studentRow"><div class="avatar">${a[0][0]}</div><b>${a[0]}</b><span class="tag ${a[1].startsWith("已到")?"ok":a[1]==="请假"?"warn":""}">${a[1]}</span><span>${a[2]}</span><span>⋯</span></div>`}).join("")}</div><div><div class="card panel"><h3>AI 快速记录</h3><div class="aiBox"><div class="mic">🎙</div><p style="text-align:center;font-size:18px">按住说话</p></div><h3>识别内容</h3><div class="input" style="height:54px">王小雨数学已完成，英语单词还需复习</div><h3>AI 解析结果</h3><div class="mCard" style="border-radius:12px;box-shadow:none"><b>学生：王小雨</b><br>记录类型：作业反馈<br>学科：数学、英语<br>状态：数学已完成；英语需复习</div><div class="row" style="margin-top:18px"><div class="btn">取消</div><div class="btn">修改</div><div class="btn primary">确认记录</div></div></div></div></div><div class="row" style="padding:0 22px 22px"><div class="card metric" style="flex:1"><div class="num">批量签到</div><div class="sub">快速完成签到</div></div><div class="card metric" style="flex:1"><div class="num">拍照反馈</div><div class="sub">上传课堂/活动照片</div></div><div class="card metric" style="flex:1"><div class="num">生成班级日报</div><div class="sub">一键生成今日报告</div></div><div class="card metric" style="flex:1"><div class="num">发送家长通知</div><div class="sub">通知家长最新情况</div></div></div>`);
}

function teacherAiQuickEntry(t) {
  return teacherBase(t, "AI 快捷录入", `<div class="teacherBody" style="grid-template-columns:1fr 1fr 380px"><div class="card panel"><h3>语音快速记录</h3><div class="aiBox"><div class="wave"></div><div style="font-size:28px;font-weight:800;margin:20px 0">00:08</div><p>正在聆听：王小雨作业已完成，李思涵请假，明日返校。</p><div class="mic">🎙</div></div><div class="input" style="height:80px;margin-top:18px">王小雨数学完成很好；李思涵今天请假；张一诺语文未完成，需要家长配合。</div></div><div class="card panel"><h3>识别结果（可编辑）</h3>${["王小雨 作业反馈 数学已完成 96%","李思涵 考勤记录 请假 94%","张一诺 作业反馈 语文未完成 91%"].map(r=>{const a=r.split(" ");return `<div class="mCard" style="border-radius:14px;margin-bottom:14px;box-shadow:none"><div class="row" style="justify-content:space-between"><b>${a[0]}</b><span class="tag ok">置信度 ${a[3]}</span></div><p>${a[1]} · ${a[2]}</p><div class="row"><div class="outlineBtn" style="flex:1">编辑</div><div class="outlineBtn" style="flex:1">取消</div></div></div>`}).join("")}<div class="btn primary" style="height:52px;justify-content:center">确认保存 3 条记录</div></div><div class="card panel"><h3>写入前确认</h3><p>所有 AI 识别出的考勤和反馈均需老师确认后写入。</p><div class="tag warn">中风险写入</div><hr style="border:0;border-top:1px solid #e5e7eb;margin:18px 0"><b>将记录到：</b><p>考勤记录、作业反馈、学生表现、AI 操作日志</p><div class="btn">查看历史记录</div></div></div>`);
}

function teacherHomeworkFeedback(t) {
  return teacherBase(t, "作业反馈与批量发送", `<div style="padding:22px;display:grid;grid-template-columns:1fr 430px;gap:18px"><div class="card panel"><div class="row" style="justify-content:space-between"><h3>作业反馈（数学 · 口算练习）</h3><div class="row"><div class="btn">AI 生成反馈</div><div class="btn primary">批量发送</div></div></div><table class="table"><tr><th>学生</th><th>作业状态</th><th>附件</th><th>AI反馈建议</th><th>发布</th></tr>${["李思源 全部完成 2张 思路清晰，计算准确，继续保持 已生成","王梓涵 部分完成 1张 计算题中等偏上，建议加强单位换算 已生成","张子轩 未完成 0张 明日补交，建议检查后再提交 待生成","刘宇辰 全部完成 3张 解题方法正确，书写工整 已生成"].map(r=>{const a=r.split(" ");return `<tr><td>${a[0]}</td><td><span class="tag ${a[1]==="全部完成"?"ok":a[1]==="部分完成"?"warn":"danger"}">${a[1]}</span></td><td>${a[2]}</td><td>${a.slice(3,-1).join("")}</td><td>${a.at(-1)}</td></tr>`}).join("")}</table><div style="margin-top:18px;border:2px dashed #cbd5e1;border-radius:12px;padding:22px;text-align:center;color:#64748b">+ 上传作业图片/附件（JPG、PNG、PDF）</div></div><div class="card panel"><h3>批量发送确认</h3><p>已选择 28 名学生，将发送作业反馈至家长端。</p><p><b>发送内容：</b>数学 · 口算练习反馈</p><p><b>附件：</b>课堂批改照片（18份）</p><div class="aiBox"><b>发布规则</b><p>AI 生成内容默认为草稿，老师确认后才会发布。</p></div><div class="row" style="margin-top:18px"><div class="btn primary" style="flex:1;justify-content:center">确认发送</div><div class="btn" style="flex:1;justify-content:center">取消</div></div></div></div>`);
}

function parentShell(t, title, body, active = "首页") {
  return doc(t, `<div class="page phone"><div class="status"><span>9:41</span><span>▰▰▰  WiFi  ▱</span></div>${body}<div class="bottomNav">${["首页","消息","AI助手","缴费","我的"].map(n=>`<div class="${n===active?"on":""}">●<br>${n}</div>`).join("")}</div></div>`, "mobile");
}

function parentHome(t) {
  return parentShell(t, "首页", `<div class="mobileTitle">晚上好，林女士</div><div class="mobileSub">陪伴成长，安心托付每一天</div><div class="mCard" style="margin-top:26px;display:flex;align-items:center;gap:18px"><div class="avatar" style="width:76px;height:76px;background:${t.primary}">陈</div><div><b style="font-size:28px">陈子轩 <span class="tag">当前</span></b><br><span class="mobileSub">三年级(2)班</span></div><span style="margin-left:auto;font-size:34px;color:#94a3b8">›</span></div><div class="mCard" style="margin-top:22px"><div class="row" style="align-items:center;justify-content:space-between"><div><div class="mobileSub">安全状态</div><div style="font-size:34px;color:${t.accent};font-weight:900;margin-top:12px">已到托管中心 ✓</div><div class="mobileSub">到达时间 14:05 · 今日在托 6.5 小时</div></div><div class="outlineBtn">查看实时动态</div></div><hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0"><div class="row" style="justify-content:space-between;text-align:center;font-size:18px">${["到达中心 14:05","作业时间 14:15","户外活动 15:30","晚餐时间 17:30","阅读时光 18:30"].map(x=>`<div><div class="dot" style="margin:auto">✓</div><br>${x}</div>`).join("")}</div></div><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:22px"><div class="mCard"><h3>作业完成情况</h3><div style="font-size:30px;color:${t.accent};font-weight:900">2/3 项完成</div><div class="outlineBtn">查看作业详情</div></div><div class="mCard"><h3>老师点评</h3><p style="font-size:22px">作业认真，书写工整，数学正确率有进步。</p><div class="outlineBtn">查看全部点评</div></div><div class="mCard"><h3>费用提醒</h3><div style="font-size:30px;color:${t.warn};font-weight:900">¥280.00</div><div class="outlineBtn">去缴费</div></div><div class="mCard"><h3>学校通知</h3><p style="font-size:21px">关于五一假期托管安排的通知</p></div></div><div class="mCard" style="margin-top:22px;background:${t.soft}"><h3>问问AI托管助手 <span class="tag">24h智能陪伴</span></h3><p style="font-size:22px">关于孩子托管的任何问题，都可以问我</p><div class="row"><div class="outlineBtn" style="flex:1">今天作业完成了吗</div><div class="outlineBtn" style="flex:1">帮我请假明天一次</div></div></div>`, "首页");
}

function parentAiAssistantLeave(t) {
  return parentShell(t, "AI助手", `<div style="text-align:center;font-size:32px;font-weight:900">AI托管助手</div><div class="row" style="margin-top:30px;align-items:center"><div class="avatar" style="width:70px;height:70px">陈</div><div style="font-size:28px;font-weight:800">陈子轩 <span class="mobileSub">三年级(2)班⌄</span></div></div><div class="mCard" style="margin-top:18px;background:${t.soft};font-size:21px">您的数据已加密，严格保护孩子隐私安全 ›</div><div class="mCard" style="margin-top:32px;margin-left:180px;border-color:${t.primary}"><div style="font-size:26px">帮我给孩子请假明天下午一次</div><div class="wave" style="margin-top:16px"></div><div class="sub">6"</div></div><div class="mCard" style="margin-top:22px"><p style="font-size:25px;line-height:1.55">好的，已识别到您想要为陈子轩提交请假申请，请确认以下信息是否正确：</p><div class="mCard" style="box-shadow:none;border-radius:18px"><div class="row" style="justify-content:space-between"><h3 style="font-size:26px;margin:0">请假申请确认</h3><span class="tag warn">待提交</span></div>${[["请假学生","陈子轩"],["请假时间","2024年5月16日 14:00-18:30"],["请假类型","事假"],["通知对象","张老师"],["是否影响餐食","是"]].map(a=>`<div class="row" style="justify-content:space-between;border-top:1px solid #e5e7eb;padding:16px 0;font-size:22px"><span>${a[0]}</span><b>${a[1]}</b></div>`).join("")}</div><div style="background:#ecfdf5;color:#047857;border-radius:14px;padding:14px;text-align:center;font-size:20px;margin-top:16px">提交后老师会收到确认通知</div><div class="row" style="margin-top:18px"><div class="bigBtn" style="flex:1">确认提交</div><div class="outlineBtn" style="flex:1">修改信息</div><div class="outlineBtn" style="flex:1">取消</div></div></div><div class="mCard" style="position:absolute;left:34px;right:34px;bottom:126px;padding:14px 18px;border-radius:18px"><div class="row"><div class="outlineBtn" style="flex:1;height:46px">查询作业</div><div class="outlineBtn" style="flex:1;height:46px">请假</div><div class="outlineBtn" style="flex:1;height:46px">缴费</div></div></div>`, "AI助手");
}

function parentHomeworkAttendanceBilling(t) {
  return parentShell(t, "作业考勤缴费", `<div class="mobileTitle">作业、考勤与费用</div><div class="mobileSub">陈子轩 · 2024年5月15日</div><div class="mCard" style="margin-top:24px"><h3>今日作业反馈</h3>${["数学口算练习 已完成 15:30提交","语文阅读 部分完成 待订正","英语单词 未完成 需复习"].map((x,i)=>`<div class="row" style="justify-content:space-between;padding:16px 0;border-bottom:1px solid #eef2f7;font-size:22px"><span>${x}</span><span class="tag ${i===0?"ok":i===1?"warn":"danger"}">${i===0?"完成":i===1?"订正":"未完成"}</span></div>`).join("")}<p style="font-size:22px">张老师：数学正确率有进步，英语单词建议今晚复习 10 分钟。</p></div><div class="mCard" style="margin-top:18px"><h3>考勤记录</h3>${["到达中心 14:05 老师签到","户外活动 15:30 正常","晚餐时间 17:30 已安排","预计离托 18:50 待签退"].map(x=>`<p style="font-size:22px;border-bottom:1px solid #eef2f7;padding-bottom:12px">${x}</p>`).join("")}</div><div class="mCard" style="margin-top:18px"><h3>费用到期提醒</h3><div style="font-size:32px;color:${t.warn};font-weight:900">剩余 5 天 · 待缴 ¥280.00</div><div class="bigBtn" style="margin-top:16px">立即缴费</div></div>`, "首页");
}

function parentProfileNotices(t) {
  return parentShell(t, "我的", `<div class="mobileTitle">我的</div><div class="mCard" style="margin-top:26px;display:flex;gap:18px;align-items:center"><div class="avatar" style="width:82px;height:82px">林</div><div><b style="font-size:28px">林女士</b><br><span class="mobileSub">绑定手机号 138****1123</span></div></div><div class="mCard" style="margin-top:22px"><h3>孩子信息</h3><div class="row" style="justify-content:space-between;font-size:22px"><span>陈子轩 · 三年级(2)班</span><span class="tag ok">在读</span></div></div><div class="mCard" style="margin-top:18px"><h3>记录与设置</h3>${["缴费记录","请假记录","消息设置","隐私与安全","家长资料"].map(x=>`<div class="row" style="justify-content:space-between;border-bottom:1px solid #eef2f7;padding:18px 0;font-size:23px"><span>${x}</span><span>›</span></div>`).join("")}</div><div class="mCard" style="margin-top:18px"><h3>通知中心</h3><p style="font-size:22px"><span class="tag">置顶</span> 关于五一假期托管安排的通知</p><p style="font-size:22px">三年级阅读活动报名提醒</p></div>`, "我的");
}

function studentShell(t, body, active = "学习任务") {
  return doc(t, `<div class="page phone" style="padding:24px 30px 20px;background:${t.studentBg}">${body}<div class="bottomNav" style="grid-template-columns:repeat(5,1fr);height:82px;border-radius:28px;font-size:16px">${["学习任务","知识乐园","我的成就","班级榜单","我的"].map(n=>`<div class="${n===active?"on":""}">★<br>${n}</div>`).join("")}</div></div>`, "student");
}

function studentTodayTask(t) {
  return studentShell(t, `<div class="status" style="margin-bottom:18px"><span>9:41</span><span>5月15日周三</span><span>100%</span></div><div style="text-align:center;font-size:42px;color:${t.primary};font-weight:900">今天的学习任务</div><div class="mCard" style="margin-top:18px;display:grid;grid-template-columns:150px 1fr 120px;align-items:center;padding:20px"><div class="avatar" style="width:104px;height:104px;font-size:40px;background:${t.primary}">轩</div><div><div style="font-size:34px;font-weight:900">今日完成 2/4</div><div style="height:12px;background:#e5e7eb;border-radius:99px;margin:14px 0"><div style="width:50%;height:100%;background:${t.primary};border-radius:99px"></div></div><div style="font-size:22px">再完成 2 个任务就能点亮星星</div></div><div style="font-size:62px">🎁</div></div><div style="background:#fff7d6;border:1px solid #fde68a;border-radius:22px;padding:16px;margin-top:18px;font-size:26px;font-weight:800;text-align:center">很棒！继续加油，你一定能拿到所有星星！</div><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:18px;gap:16px">${[["数学口算","三位数加减法","75%","继续练习","🔢"],["语文阅读","《小英雄雨来》节选","50%","继续阅读","📖"],["英语单词","学习 15 个新单词","100%","已完成","🔤"],["错题复习","数学 · 乘法口诀表","0%","开始复习","📋"]].map((a,i)=>`<div class="mCard" style="padding:18px"><div class="row" style="align-items:center"><div style="font-size:50px">${a[4]}</div><div><h3 style="font-size:28px;margin:0;color:${i===1?t.warn:i===3?"#8b5cf6":t.primary}">${a[0]}</h3><p style="font-size:20px;margin:8px 0">${a[1]}</p></div><div style="margin-left:auto;font-size:32px;color:${i===2?t.accent:t.primary};font-weight:900">${a[2]}</div></div><div class="bigBtn" style="height:50px;background:${i===1?t.warn:i===3?"#8b5cf6":i===2?t.accent:t.primary}">${a[3]}</div></div>`).join("")}</div>`);
}

function studentLearningHomework(t) {
  return studentShell(t, `<div class="status"><span>9:41</span><span>学习中心</span><span>100%</span></div><div class="mCard" style="background:${t.soft}"><div class="row" style="align-items:center"><div style="font-size:84px">🤖</div><div><div style="font-size:34px;font-weight:900">小智学习入口</div><p style="font-size:23px">先完成今天任务，再复习错题。遇到不会的题可以拍照提问。</p></div></div></div><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:22px">${[["今日作业","数学、语文、英语","2/3 已完成","去完成"],["我的错题本","数学 8 道 · 语文 5 道","连续复习 3 天","去复习"],["拍照提问","上传不会的题目","老师可查看记录","拍照"],["语音提问","说出你的问题","短句讲解，不给长答案","按住说"]].map((a,i)=>`<div class="mCard"><h3 style="font-size:30px;color:${i===1?t.warn:t.primary}">${a[0]}</h3><p style="font-size:23px">${a[1]}</p><div class="tag">${a[2]}</div><div class="bigBtn" style="margin-top:18px;background:${i===1?t.warn:i===3?t.accent:t.primary}">${a[3]}</div></div>`).join("")}</div><div class="mCard" style="margin-top:22px"><h3 style="font-size:30px">本周目标</h3>${["完成每天作业反馈","复习 10 道错题","获得 4 颗努力星","按时提交作业"].map((x,i)=>`<div class="row" style="font-size:24px;padding:14px 0;border-bottom:1px solid #eef2f7"><span>${i<2?"✅":"☆"}</span><span>${x}</span></div>`).join("")}</div><div class="mCard" style="margin-top:22px"><h3 style="font-size:30px">老师鼓励</h3><p style="font-size:24px;line-height:1.6">陈子轩今天数学进步明显，阅读任务还差一点点，继续坚持！</p></div>`, "知识乐园");
}

function loginRoleSwitch(t) {
  return doc(t, `<div class="page loginWrap"><div class="loginHero"><div class="brand"><div class="mark">智</div><div>智托管AI</div></div><h1>晚辅托管数字化管理平台</h1><p style="font-size:24px;line-height:1.6;max-width:560px">统一登录入口，覆盖校长、老师、家长与学生端。AI 入口贯穿高频流程，写入动作确认后执行。</p><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:48px;max-width:620px">${["今日托管闭环","AI 确认卡片","家校沟通留痕","收费到期提醒"].map(x=>`<div style="background:rgba(255,255,255,.14);border-radius:16px;padding:22px;font-size:22px">✓ ${x}</div>`).join("")}</div></div><div class="loginPanel"><h2 style="font-size:34px;margin:0 0 8px">选择角色登录</h2><p class="sub">使用手机号、账号或机构分配的登录码</p><div class="roleGrid" style="margin:24px 0">${["校长/管理员","老师端","家长端","学生端"].map((x,i)=>`<div class="role ${i===0?"active":""}"><b style="font-size:20px">${x}</b><p class="sub">${["经营看板、学生班级、费用通知","今日托管、AI录入、作业反馈","孩子状态、请假缴费、老师留言","学习任务、错题复习、拍照提问"][i]}</p></div>`).join("")}</div><div class="input" style="height:52px;margin-bottom:14px">手机号 / 账号</div><div class="input" style="height:52px;margin-bottom:20px">密码 / 验证码</div><div class="btn primary" style="height:54px;justify-content:center;font-size:18px">进入系统</div><p class="sub" style="text-align:center;margin-top:18px">高风险 AI 操作将引导至传统页面，不会自动执行</p></div></div>`, "login");
}

function overviewBoard(t) {
  const names = ["管理端首页", "AI操作日志", "老师今日托管", "老师AI录入", "家长首页", "家长请假确认", "学生任务", "学生学习入口", "登录入口"];
  return doc(t, `<div class="overview">${names.map((n,i)=>`<div class="mini"><h2>${i+1}. ${n}</h2><div class="fake"><div class="row" style="gap:8px"><div style="width:72px;height:170px;border-radius:10px;background:${i<2?t.primaryDark:t.soft}"></div><div style="flex:1">${Array.from({length:i%3+3}).map((_,j)=>`<div style="height:${32+j*8}px;background:${j%2?t.soft:"#fff"};border:1px solid #e5e7eb;border-radius:10px;margin-bottom:10px"></div>`).join("")}<div class="btn primary" style="width:150px">关键操作</div></div></div></div></div>`).join("")}</div>`, "overview");
}

async function render() {
  const executableCandidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  const executablePath = executableCandidates.find((candidate) => fs.existsSync(candidate));
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    for (const scheme of schemes) {
      const outDir = path.join(ROOT, scheme.dir);
      fs.mkdirSync(outDir, { recursive: true });
      for (const [filename, type, fn] of pages) {
        const page = await browser.newPage({ viewport: viewports[type], deviceScaleFactor: 1 });
        await page.setContent(fn(scheme), { waitUntil: "networkidle" });
        await page.screenshot({ path: path.join(outDir, filename), fullPage: false });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}

render().catch((err) => {
  console.error(err);
  process.exit(1);
});
