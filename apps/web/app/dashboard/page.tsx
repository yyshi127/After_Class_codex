"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarCheck2,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  Home,
  LogOut,
  School,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { AdminDashboardData, getAdminDashboard } from "../../src/api-client";
import { AuthUser, clearSession, getStoredToken, getStoredUser, loadMe, saveSession } from "../../src/auth-client";

const roleLabels: Record<AuthUser["role"], string> = {
  admin: "校长/管理员",
  teacher: "老师",
  guardian: "家长",
  student: "学生",
};

const roleLanding: Record<AuthUser["role"], Array<{ title: string; text: string; href: string }>> = {
  admin: [
    { title: "学生与班级", text: "维护学生档案、班级、校区和托管服务信息。", href: "/admin/students" },
    { title: "财务核算", text: "查看缴费记录、服务到期、班级收入和老师课费。", href: "/admin/finance" },
  ],
  teacher: [
    { title: "今日工作台", text: "查看负责班级、学生到校、请假、缺勤和作业状态。", href: "/teacher/today" },
    { title: "作业反馈", text: "上传作业图片、发布批改反馈、确认错题并生成练习单。", href: "/teacher/homework" },
  ],
  guardian: [
    { title: "孩子状态", text: "查看到校、作业照片、批改图片和三类点评反馈。", href: "/parent/home" },
    { title: "服务信息", text: "只展示服务有效期和续费提示，不展示余额和经营数据。", href: "/parent/home" },
  ],
  student: [
    { title: "今日任务", text: "查看作业任务、完成进度和错题复习入口。", href: "/student/home" },
    { title: "学习入口", text: "保留拍照提问入口，MVP 不做复杂 AI 讲题闭环。", href: "/student/home" },
  ],
};

const navItems = [
  { icon: Home, label: "首页", href: "/dashboard" },
  { icon: Users, label: "学生与班级", href: "/admin/students" },
  { icon: CalendarCheck2, label: "考勤管理", href: "/admin/attendance" },
  { icon: ClipboardCheck, label: "老师工作台", href: "/teacher/today" },
  { icon: BookOpenCheck, label: "作业反馈", href: "/teacher/homework" },
  { icon: CreditCard, label: "财务核算", href: "/admin/finance" },
  { icon: UserRound, label: "家长端", href: "/parent/home" },
  { icon: GraduationCap, label: "学生端", href: "/student/home" },
  { icon: ShieldCheck, label: "AI 日志", href: "/admin/ai-log" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const campuses = useMemo(() => user?.campuses ?? [], [user]);

  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();

    if (!token) {
      router.replace("/login");
      return;
    }

    if (storedUser) {
      setUser(storedUser);
    }

    loadMe(token)
      .then(({ user: freshUser }) => {
        setUser(freshUser);
        saveSession({ accessToken: token, user: freshUser });
        if (freshUser.role === "admin") {
          return getAdminDashboard().then(setDashboard);
        }
        return undefined;
      })
      .catch((error) => {
        if (error instanceof Error && error.message !== "登录状态已失效") {
          setMessage(error.message);
          return;
        }
        clearSession();
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  if (loading && !user) {
    return <main className="min-h-screen bg-serenity-bg p-8 text-serenity-muted">正在恢复登录状态...</main>;
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-serenity-bg p-5 text-serenity-ink">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-[32px] bg-serenity-surface p-5 shadow-neumorphic">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-serenity-bg shadow-insetSoft">
              <School className="h-6 w-6 text-serenity-blue" />
            </div>
            <div>
              <div className="font-semibold">AfterClass</div>
              <div className="text-xs text-serenity-muted">晚辅托管系统</div>
            </div>
          </div>

          <nav className="mt-8 grid gap-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-serenity-muted hover:bg-serenity-bg"
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="grid gap-5">
          <header className="flex flex-col gap-4 rounded-[32px] bg-serenity-surface p-6 shadow-neumorphic md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm text-serenity-muted">{roleLabels[user.role]}</div>
              <h1 className="mt-1 text-3xl font-semibold">{user.name}，欢迎回来</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none">
                {campuses.map((campus) => (
                  <option key={campus.id}>{campus.name}</option>
                ))}
              </select>
              <button onClick={logout} className="flex h-11 items-center gap-2 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft">
                <LogOut className="h-4 w-4" />
                退出
              </button>
            </div>
          </header>

          {user.role === "admin" && dashboard ? <AdminDashboard dashboard={dashboard} /> : <RoleLanding user={user} campuses={campuses} />}
          {message ? <div className="rounded-3xl bg-serenity-surface p-4 text-sm text-serenity-muted shadow-neumorphic">{message}</div> : null}
        </section>
      </div>
    </main>
  );
}

function RoleLanding({ user, campuses }: { user: AuthUser; campuses: Array<{ id: string; name: string }> }) {
  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        {roleLanding[user.role].map((card) => (
          <Link key={card.title} href={card.href} className="rounded-[28px] bg-serenity-surface p-6 shadow-neumorphic">
            <h2 className="text-xl font-semibold">{card.title}</h2>
            <p className="mt-3 leading-7 text-serenity-muted">{card.text}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-[28px] bg-serenity-surface p-6 shadow-neumorphic">
        <h2 className="text-xl font-semibold">当前权限范围</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoTile label="角色" value={roleLabels[user.role]} />
          <InfoTile label="授权校区" value={`${campuses.length} 个`} />
          <InfoTile label="手机号" value={user.phone ?? "未填写"} />
        </div>
      </section>
    </>
  );
}

function AdminDashboard({ dashboard }: { dashboard: AdminDashboardData }) {
  const metrics = dashboard.metrics;
  const cards = [
    { label: "今日托管人数", value: `${metrics.todayCareStudentCount}`, helper: `在读 ${metrics.activeStudentCount} 人` },
    { label: "今日出勤率", value: `${metrics.attendanceRate}%`, helper: "按已签到/签退学生去重" },
    { label: "待处理请假", value: `${metrics.pendingLeaveCount}`, helper: "需要老师或管理员确认" },
    { label: "作业完成率", value: `${metrics.homeworkCompletionRate}%`, helper: `今日作业 ${metrics.todayHomeworkTotal} 条` },
    { label: "服务即将到期", value: `${metrics.expiringServiceCount}`, helper: "未来 7 天内到期" },
    { label: "风险预警", value: `${metrics.riskWarningCount}`, helper: `含逾期未结 ${metrics.overdueBillingCount} 条` },
  ];

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
            <div className="text-sm text-serenity-muted">{card.label}</div>
            <div className="mt-2 text-3xl font-semibold">{card.value}</div>
            <div className="mt-2 text-sm text-serenity-muted">{card.helper}</div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-5">
          <section className="rounded-[28px] bg-serenity-surface p-6 shadow-neumorphic">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">各校区数据概览</h2>
              <span className="text-sm text-serenity-muted">{dashboard.date}</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {dashboard.campusOverview.map((campus) => (
                <article key={campus.id} className="rounded-3xl bg-serenity-bg p-4 shadow-insetSoft">
                  <div className="font-semibold">{campus.name}</div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <InfoMini label="班级" value={`${campus.classCount}`} />
                    <InfoMini label="在读" value={`${campus.activeStudentCount}`} />
                    <InfoMini label="今日到校" value={`${campus.todayAttendanceCount}`} />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-serenity-surface p-6 shadow-neumorphic">
            <h2 className="text-xl font-semibold">班级状态</h2>
            <div className="mt-5 overflow-hidden rounded-3xl bg-serenity-bg shadow-insetSoft">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="text-serenity-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">班级</th>
                    <th className="px-4 py-3 font-medium">校区</th>
                    <th className="px-4 py-3 font-medium">在读</th>
                    <th className="px-4 py-3 font-medium">今日到校</th>
                    <th className="px-4 py-3 font-medium">出勤率</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.classStatus.map((item) => (
                    <tr key={item.id} className="border-t border-white/70">
                      <td className="px-4 py-3 font-semibold">{item.name}</td>
                      <td className="px-4 py-3 text-serenity-muted">{item.campusName}</td>
                      <td className="px-4 py-3">{item.activeStudentCount}</td>
                      <td className="px-4 py-3">{item.todayAttendanceCount}</td>
                      <td className="px-4 py-3">{item.attendanceRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="grid content-start gap-5">
          <section className="rounded-[28px] bg-serenity-surface p-6 shadow-neumorphic">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-serenity-blue" />
              <h2 className="text-xl font-semibold">风险预警</h2>
            </div>
            <div className="mt-5 grid gap-3">
              <InfoTile label="待处理请假" value={`${metrics.pendingLeaveCount} 条`} />
              <InfoTile label="逾期未结" value={`${metrics.overdueBillingCount} 条`} />
              <InfoTile label="服务即将到期" value={`${metrics.expiringServiceCount} 人`} />
            </div>
          </section>

          <section className="rounded-[28px] bg-serenity-surface p-6 shadow-neumorphic">
            <h2 className="text-xl font-semibold">最近操作日志</h2>
            <div className="mt-5 grid gap-3">
              {dashboard.recentLogs.map((log) => (
                <article key={log.id} className="rounded-3xl bg-serenity-bg p-4 text-sm shadow-insetSoft">
                  <div className="font-semibold">{log.action}</div>
                  <div className="mt-1 text-serenity-muted">{log.actor?.name ?? "系统"} · {log.campus?.name ?? "未关联校区"}</div>
                  <div className="mt-1 text-xs text-serenity-muted">{new Date(log.createdAt).toLocaleString("zh-CN")}</div>
                </article>
              ))}
              {!dashboard.recentLogs.length ? <div className="rounded-3xl bg-serenity-bg p-5 text-center text-sm text-serenity-muted shadow-insetSoft">暂无操作日志</div> : null}
            </div>
          </section>
        </aside>
      </section>
    </>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-serenity-bg p-4 shadow-insetSoft">
      <div className="text-sm text-serenity-muted">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-serenity-muted">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
