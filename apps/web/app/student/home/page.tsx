"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  Camera,
  CheckCircle2,
  HelpCircle,
  LogOut,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import {
  HomeworkReviewItem,
  MistakeItem,
  StudentItem,
  listHomeworkReviews,
  listMistakes,
  listStudents,
} from "../../../src/api-client";
import { AuthUser, clearSession, getStoredToken, getStoredUser, loadMe, saveSession } from "../../../src/auth-client";

const taskLabels: Record<HomeworkReviewItem["status"], string> = {
  pending: "进行中",
  completed: "已完成",
  needs_correction: "待订正",
};

export default function StudentHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [reviews, setReviews] = useState<HomeworkReviewItem[]>([]);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const student = students[0];
  const completedCount = reviews.filter((item) => item.status === "completed").length;
  const progress = reviews.length ? Math.round((completedCount / reviews.length) * 100) : 0;
  const confirmedMistakes = mistakes.filter((item) => item.status === "confirmed");
  const selectedQuestions = mistakes.flatMap((item) => item.similarQuestions?.filter((question) => question.status === "selected") ?? []);

  const encouragement = useMemo(() => {
    if (!reviews.length) return "今天还没有新的作业任务，先保持好状态。";
    if (progress === 100) return "今日任务完成，给自己一颗星。";
    if (progress >= 50) return "已经完成一大半，再检查一下错题。";
    return "先从最容易的一项开始，完成后就能点亮进度。";
  }, [progress, reviews.length]);

  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();

    if (!token) {
      router.replace("/login");
      return;
    }

    if (storedUser) setUser(storedUser);

    loadMe(token)
      .then(({ user: freshUser }) => {
        if (freshUser.role !== "student") {
          router.replace("/dashboard");
          return;
        }
        setUser(freshUser);
        saveSession({ accessToken: token, user: freshUser });
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function reload() {
    setLoading(true);
    setMessage("");
    try {
      const studentRows = await listStudents({ status: "active" });
      setStudents(studentRows);
      const currentStudent = studentRows[0];
      if (!currentStudent) {
        setReviews([]);
        setMistakes([]);
        return;
      }

      const [reviewRows, mistakeRows] = await Promise.all([
        listHomeworkReviews({ studentId: currentStudent.id }),
        listMistakes({ studentId: currentStudent.id }),
      ]);
      setReviews(reviewRows);
      setMistakes(mistakeRows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearSession();
    router.replace("/login");
  }

  if (!user) {
    return <main className="min-h-screen bg-serenity-bg p-8 text-serenity-muted">正在加载学生端...</main>;
  }

  return (
    <main className="min-h-screen bg-serenity-bg p-4 text-serenity-ink md:p-6">
      <div className="mx-auto grid max-w-6xl gap-5">
        <header className="rounded-[32px] bg-serenity-surface p-5 shadow-neumorphic md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-serenity-muted">
                <ArrowLeft className="h-4 w-4" />
                返回工作台
              </Link>
              <h1 className="mt-3 text-3xl font-semibold">{student?.name ?? user.name}，今天也稳稳完成。</h1>
              <p className="mt-2 text-sm text-serenity-muted">看任务、查错题、做同类题，复杂 AI 讲题先不放进 MVP。</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => void reload()} className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm font-semibold shadow-insetSoft">
                刷新
              </button>
              <button onClick={logout} className="flex h-11 items-center gap-2 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft">
                <LogOut className="h-4 w-4" />
                退出
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[32px] bg-serenity-surface p-5 shadow-neumorphic">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-serenity-muted">今日学习任务</div>
                <h2 className="mt-1 text-2xl font-semibold">完成进度 {progress}%</h2>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-serenity-bg shadow-insetSoft">
                <Trophy className="h-8 w-8 text-serenity-blue" />
              </div>
            </div>

            <div className="mt-5 h-4 rounded-full bg-serenity-bg shadow-insetSoft">
              <div className="h-4 rounded-full bg-serenity-blue transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 rounded-3xl bg-serenity-bg p-4 text-sm leading-6 text-serenity-muted shadow-insetSoft">
              {encouragement}
            </div>

            <div className="mt-5 grid gap-3">
              {reviews.slice(0, 5).map((item) => (
                <article key={item.id} className="flex items-center justify-between gap-4 rounded-3xl bg-serenity-bg p-4 shadow-insetSoft">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70">
                      {item.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-serenity-blue" /> : <BookOpenCheck className="h-5 w-5 text-serenity-muted" />}
                    </div>
                    <div>
                      <div className="font-semibold">{item.subject ?? "作业任务"}</div>
                      <div className="mt-1 text-xs text-serenity-muted">{item.teacherComment ?? "等待老师更新批改反馈"}</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-serenity-muted">{taskLabels[item.status]}</span>
                </article>
              ))}
              {!reviews.length ? (
                <div className="rounded-3xl bg-serenity-bg p-6 text-center text-sm text-serenity-muted shadow-insetSoft">
                  {loading ? "正在加载任务..." : "今天还没有作业任务"}
                </div>
              ) : null}
            </div>
          </section>

          <aside className="grid gap-5">
            <section className="rounded-[32px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">奖励反馈</h2>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {["专注", "订正", "坚持"].map((label, index) => (
                  <div key={label} className="rounded-3xl bg-serenity-bg p-4 text-center shadow-insetSoft">
                    <Sparkles className={`mx-auto h-6 w-6 ${progress >= (index + 1) * 30 ? "text-serenity-blue" : "text-serenity-muted"}`} />
                    <div className="mt-2 text-sm font-semibold">{label}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">错题与复习</h2>
              </div>
              <div className="mt-5 grid gap-3">
                <div className="rounded-3xl bg-serenity-bg p-4 shadow-insetSoft">
                  <div className="text-sm text-serenity-muted">已确认错题</div>
                  <div className="mt-1 text-2xl font-semibold">{confirmedMistakes.length} 题</div>
                </div>
                <div className="rounded-3xl bg-serenity-bg p-4 shadow-insetSoft">
                  <div className="text-sm text-serenity-muted">同类题练习</div>
                  <div className="mt-1 text-2xl font-semibold">{selectedQuestions.length} 题</div>
                </div>
                {confirmedMistakes.slice(0, 3).map((item) => (
                  <article key={item.id} className="rounded-3xl bg-serenity-bg p-4 text-sm leading-6 text-serenity-muted shadow-insetSoft">
                    <div className="font-semibold text-serenity-ink">{item.knowledgePoint ?? "待确认知识点"}</div>
                    <div>{item.question ?? "老师已确认错题，等待补充题目内容。"}</div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">拍照提问</h2>
              </div>
              <button
                onClick={() => setMessage("拍照提问是后续扩展入口，MVP 暂不接入复杂 AI 讲题闭环。")}
                className="mt-5 w-full rounded-2xl bg-serenity-bg px-4 py-3 text-sm font-semibold text-serenity-muted shadow-insetSoft"
              >
                预留入口
              </button>
            </section>

            {message ? <div className="rounded-3xl bg-serenity-surface p-4 text-sm text-serenity-muted shadow-neumorphic">{message}</div> : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
