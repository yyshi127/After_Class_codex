import { SERVICE_TYPES, USER_ROLES } from "@afterclass/shared";
import Link from "next/link";

const cards = [
  { title: "管理端", text: "多校区、学生档案、考勤、收费、班级核算、AI 日志。" },
  { title: "老师端", text: "拍照签到、作业批改、今日点评、错题本和练习单。" },
  { title: "家长端", text: "到校通知、作业原图和批改图、三类点评、服务有效期。" },
  { title: "学生端", text: "今日任务、学习进度、错题复习和拍照提问入口。" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-8 text-serenity-ink">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="rounded-[32px] bg-serenity-surface p-8 shadow-neumorphic">
          <p className="text-sm font-medium text-serenity-muted">AfterClass MVP</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal">智能晚辅托管系统项目骨架</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-serenity-muted">
            当前页面用于验证 Next.js 前端、共享类型包和 Serenity-Neumorphic 基础设计 token 已接入。
            后续将按开发任务清单逐步实现管理端、老师端、家长端和学生端。
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex h-12 items-center rounded-2xl bg-serenity-blue px-6 text-base font-semibold text-white shadow-neumorphic"
          >
            进入登录
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {cards.map((card) => (
            <article key={card.title} className="rounded-[28px] bg-serenity-surface p-6 shadow-neumorphic">
              <h2 className="text-xl font-semibold">{card.title}</h2>
              <p className="mt-3 leading-7 text-serenity-muted">{card.text}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-[28px] bg-serenity-surface p-6 shadow-neumorphic">
            <h2 className="text-xl font-semibold">固定托管类型</h2>
            <div className="mt-4 grid gap-3">
              {SERVICE_TYPES.map((type) => (
                <div key={type.code} className="rounded-2xl bg-serenity-bg px-4 py-3 shadow-insetSoft">
                  <div className="font-medium">{type.name}</div>
                  <div className="mt-1 text-sm text-serenity-muted">{type.description}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-serenity-surface p-6 shadow-neumorphic">
            <h2 className="text-xl font-semibold">系统角色</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {USER_ROLES.map((role) => (
                <span key={role} className="rounded-full bg-serenity-bg px-4 py-2 text-sm font-medium shadow-insetSoft">
                  {role}
                </span>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
