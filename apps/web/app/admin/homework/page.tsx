"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, CheckCircle2, FileText, Image as ImageIcon, RefreshCcw } from "lucide-react";
import {
  ClassItem,
  FeedbackItem,
  HomeworkReviewItem,
  StudentItem,
  listClasses,
  listFeedback,
  listHomeworkReviews,
  listStudents,
} from "../../../src/api-client";
import { AuthUser, clearSession, getStoredToken, getStoredUser, loadMe, saveSession } from "../../../src/auth-client";

const homeworkLabels: Record<HomeworkReviewItem["status"], string> = {
  pending: "待确认",
  completed: "已反馈",
  needs_correction: "需订正",
};

const feedbackLabels: Record<FeedbackItem["status"], string> = {
  draft: "草稿",
  published: "已发布",
};

const imageLabels: Record<string, string> = {
  original: "作业原图",
  reviewed: "老师批改图",
  ai_marked: "AI 圈错建议",
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminHomeworkPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [reviews, setReviews] = useState<HomeworkReviewItem[]>([]);
  const [feedbackRows, setFeedbackRows] = useState<FeedbackItem[]>([]);
  const [campusId, setCampusId] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const campuses = useMemo(() => user?.campuses ?? [], [user]);
  const selectedCampusId = campusId || campuses[0]?.id || "";

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
        if (freshUser.role !== "admin") {
          router.replace("/dashboard");
          return;
        }
        setUser(freshUser);
        saveSession({ accessToken: token, user: freshUser });
        setCampusId(freshUser.campuses?.[0]?.id ?? "");
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    if (!selectedCampusId) return;
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampusId, classId, studentId]);

  async function reload() {
    setLoading(true);
    setMessage("");
    try {
      const [classRows, studentRows] = await Promise.all([
        listClasses(selectedCampusId),
        listStudents({ campusId: selectedCampusId, classId: classId || undefined, status: "active" }),
      ]);
      const [reviewRows, feedbackList] = await Promise.all([
        listHomeworkReviews({ campusId: selectedCampusId, studentId: studentId || undefined }),
        listFeedback({ campusId: selectedCampusId, studentId: studentId || undefined }),
      ]);
      setClasses(classRows);
      setStudents(studentRows);
      setReviews(reviewRows);
      setFeedbackRows(feedbackList);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return <main className="min-h-screen bg-serenity-bg p-8 text-serenity-muted">正在加载作业与点评...</main>;
  }

  return (
    <main className="min-h-screen bg-serenity-bg p-5 text-serenity-ink">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-[32px] bg-serenity-surface p-6 shadow-neumorphic">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-serenity-muted">
                <ArrowLeft className="h-4 w-4" />
                返回工作台
              </Link>
              <h1 className="mt-3 text-3xl font-semibold">作业与点评管理</h1>
              <p className="mt-2 text-sm text-serenity-muted">查看作业原图、老师批改图、AI 圈错建议和已发布给家长的三类点评。</p>
            </div>

            <button
              onClick={() => void reload()}
              className="flex h-11 items-center gap-2 rounded-2xl bg-serenity-bg px-4 text-sm font-medium shadow-insetSoft"
            >
              <RefreshCcw className="h-4 w-4" />
              刷新
            </button>
          </div>
        </header>

        <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm font-medium">
              校区
              <select
                value={selectedCampusId}
                onChange={(event) => {
                  setCampusId(event.target.value);
                  setClassId("");
                  setStudentId("");
                }}
                className="mt-2 h-11 w-full rounded-2xl bg-serenity-bg px-4 shadow-insetSoft outline-none"
              >
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium">
              班级
              <select
                value={classId}
                onChange={(event) => {
                  setClassId(event.target.value);
                  setStudentId("");
                }}
                className="mt-2 h-11 w-full rounded-2xl bg-serenity-bg px-4 shadow-insetSoft outline-none"
              >
                <option value="">全部班级</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium">
              学生
              <select
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className="mt-2 h-11 w-full rounded-2xl bg-serenity-bg px-4 shadow-insetSoft outline-none"
              >
                <option value="">全部学生</option>
                {students.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ImageIcon className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">作业批改记录</h2>
              </div>
              <span className="text-sm text-serenity-muted">{loading ? "加载中" : `${reviews.length} 条`}</span>
            </div>

            <div className="mt-5 grid gap-4">
              {reviews.map((item) => (
                <article key={item.id} className="rounded-3xl bg-serenity-bg p-5 shadow-insetSoft">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-lg font-semibold">
                        {item.student?.name ?? "未知学生"} · {item.subject || "未填科目"}
                      </div>
                      <div className="mt-2 text-sm text-serenity-muted">
                        {item.student?.class?.name ?? "未分班"} · 老师 {item.teacher?.name ?? "-"} · {formatDateTime(item.createdAt)}
                      </div>
                    </div>
                    <span className="w-fit rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-serenity-muted">
                      {homeworkLabels[item.status]}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {["original", "reviewed", "ai_marked"].map((type) => {
                      const image = item.images?.find((row) => row.type === type);
                      return (
                        <div key={type} className="rounded-2xl bg-white/70 p-4">
                          <div className="text-sm font-semibold">{imageLabels[type]}</div>
                          {image ? (
                            <div className="mt-2 break-all text-xs leading-5 text-serenity-muted">{image.url}</div>
                          ) : (
                            <div className="mt-2 text-xs text-serenity-muted">暂无图片</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-white/70 p-4">
                      <div className="text-sm font-semibold">老师点评</div>
                      <p className="mt-2 text-sm leading-6 text-serenity-muted">{item.teacherComment || "暂无点评"}</p>
                    </div>
                    <div className="rounded-2xl bg-white/70 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Bot className="h-4 w-4 text-serenity-blue" />
                        AI 圈错建议
                      </div>
                      <p className="mt-2 text-sm leading-6 text-serenity-muted">{item.aiSummary || "暂无 AI 建议"}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm text-serenity-muted">
                    <CheckCircle2 className="h-4 w-4 text-serenity-blue" />
                    家长反馈状态：{item.publishedAt ? `已发布 ${formatDateTime(item.publishedAt)}` : "尚未发布"}
                  </div>
                </article>
              ))}

              {!reviews.length ? (
                <div className="rounded-3xl bg-serenity-bg p-8 text-center text-sm text-serenity-muted shadow-insetSoft">
                  暂无作业批改记录
                </div>
              ) : null}
            </div>
          </section>

          <aside className="grid content-start gap-5">
            <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-serenity-blue" />
                  <h2 className="text-xl font-semibold">今日点评反馈</h2>
                </div>
                <span className="text-sm text-serenity-muted">{feedbackRows.length} 条</span>
              </div>

              <div className="mt-5 grid gap-3">
                {feedbackRows.map((item) => (
                  <article key={item.id} className="rounded-3xl bg-serenity-bg p-4 shadow-insetSoft">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{item.student?.name ?? "未知学生"}</div>
                      <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-serenity-muted">
                        {feedbackLabels[item.status]}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm leading-6 text-serenity-muted">
                      <div>行为表现：{item.behavior}</div>
                      <div>作业完成：{item.homework}</div>
                      <div>知识掌握：{item.knowledge}</div>
                    </div>
                    <div className="mt-3 text-xs text-serenity-muted">
                      老师 {item.teacher?.name ?? "-"} · {item.publishedAt ? `已发布 ${formatDateTime(item.publishedAt)}` : "未发布"}
                    </div>
                  </article>
                ))}

                {!feedbackRows.length ? (
                  <div className="rounded-3xl bg-serenity-bg p-8 text-center text-sm text-serenity-muted shadow-insetSoft">
                    暂无今日点评
                  </div>
                ) : null}
              </div>
            </section>

            {message ? <div className="rounded-3xl bg-serenity-surface p-4 text-sm text-serenity-muted shadow-neumorphic">{message}</div> : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
