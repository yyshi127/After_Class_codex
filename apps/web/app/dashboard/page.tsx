"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpenCheck, CalendarCheck2, ClipboardCheck, CreditCard, Home, LogOut, School, ShieldCheck, UserRound, Users } from "lucide-react";
import { AuthUser, clearSession, getStoredToken, getStoredUser, loadMe, saveSession } from "../../src/auth-client";

const roleLabels: Record<AuthUser["role"], string> = {
  admin: "校长/管理员",
  teacher: "老师",
  guardian: "家长",
  student: "学生",
};

const roleLanding: Record<AuthUser["role"], Array<{ title: string; text: string }>> = {
  admin: [
    { title: "多校区看板", text: "按授权校区查看托管人数、出勤、作业和经营数据。" },
    { title: "权限与审计", text: "管理角色、校区范围、敏感信息查看和操作日志。" },
  ],
  teacher: [
    { title: "今日工作台", text: "查看负责班级、学生到校、请假、缺勤和作业状态。" },
    { title: "批量操作", text: "后续接入拍照签到、作业批改和今日点评。" },
  ],
  guardian: [
    { title: "孩子状态", text: "查看孩子到校、作业照片、批改图片和老师点评。" },
    { title: "服务信息", text: "只展示服务有效期和续费提示，不展示余额或欠费金额。" },
  ],
  student: [
    { title: "今日任务", text: "查看作业任务、完成进度和错题复习入口。" },
    { title: "学习入口", text: "后续保留拍照提问和同类题练习入口。" },
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
  { icon: ShieldCheck, label: "权限审计", href: "/dashboard" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

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
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const campuses = useMemo(() => user?.campuses ?? [], [user]);

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
              <div className="text-xs text-serenity-muted">MVP 权限底座</div>
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

          <div className="grid gap-5 md:grid-cols-2">
            {roleLanding[user.role].map((card) => (
              <article key={card.title} className="rounded-[28px] bg-serenity-surface p-6 shadow-neumorphic">
                <h2 className="text-xl font-semibold">{card.title}</h2>
                <p className="mt-3 leading-7 text-serenity-muted">{card.text}</p>
              </article>
            ))}
          </div>

          <section className="rounded-[28px] bg-serenity-surface p-6 shadow-neumorphic">
            <h2 className="text-xl font-semibold">当前权限范围</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-serenity-bg p-4 shadow-insetSoft">
                <div className="text-sm text-serenity-muted">角色</div>
                <div className="mt-1 font-semibold">{roleLabels[user.role]}</div>
              </div>
              <div className="rounded-2xl bg-serenity-bg p-4 shadow-insetSoft">
                <div className="text-sm text-serenity-muted">授权校区</div>
                <div className="mt-1 font-semibold">{campuses.length} 个</div>
              </div>
              <div className="rounded-2xl bg-serenity-bg p-4 shadow-insetSoft">
                <div className="text-sm text-serenity-muted">手机号</div>
                <div className="mt-1 font-semibold">{user.phone}</div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
