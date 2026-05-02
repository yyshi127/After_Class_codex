"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  Camera,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  LogOut,
  MessageSquareText,
  RefreshCcw,
} from "lucide-react";
import {
  ClassItem,
  FeedbackItem,
  HomeworkReviewItem,
  StudentItem,
  createHomeworkReview,
  listClasses,
  listFeedback,
  listHomeworkReviews,
  listStudents,
  publishFeedback,
  publishHomeworkReview,
} from "../../../src/api-client";
import { AuthUser, clearSession, getStoredToken, getStoredUser, loadMe, saveSession } from "../../../src/auth-client";

const statusLabels: Record<HomeworkReviewItem["status"], string> = {
  pending: "待确认",
  completed: "已反馈",
  needs_correction: "需订正",
};

export default function TeacherHomeworkPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [reviews, setReviews] = useState<HomeworkReviewItem[]>([]);
  const [feedbackRows, setFeedbackRows] = useState<FeedbackItem[]>([]);
  const [campusId, setCampusId] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("数学");
  const [originalImageUrl, setOriginalImageUrl] = useState("s3://dev/homework/original.jpg");
  const [reviewedImageUrl, setReviewedImageUrl] = useState("s3://dev/homework/reviewed.jpg");
  const [teacherComment, setTeacherComment] = useState("作业已批改，错题已标记，请回家后订正。");
  const [behavior, setBehavior] = useState("上课专注，能主动跟进老师提醒。");
  const [homework, setHomework] = useState("今日作业按时完成，书写较整洁。");
  const [knowledge, setKnowledge] = useState("计算基础稳定，应用题审题还需加强。");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const campuses = useMemo(() => user?.campuses ?? [], [user]);
  const selectedCampusId = campusId || campuses[0]?.id || "";
  const selectedClassId = classId || classes[0]?.id || "";
  const selectedStudentId = studentId || students[0]?.id || "";
  const pendingReview = reviews.find((item) => item.studentId === selectedStudentId && item.status === "pending");

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
        if (!["admin", "teacher"].includes(freshUser.role)) {
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
  }, [selectedCampusId, selectedClassId, selectedStudentId]);

  async function reload() {
    setLoading(true);
    setMessage("");
    try {
      const classRows = await listClasses(selectedCampusId);
      setClasses(classRows);
      const activeClassId = selectedClassId || classRows[0]?.id || "";
      if (!classId && activeClassId) setClassId(activeClassId);

      const studentRows = activeClassId ? await listStudents({ campusId: selectedCampusId, classId: activeClassId, status: "active" }) : [];
      setStudents(studentRows);
      const activeStudentId = selectedStudentId || studentRows[0]?.id || "";
      if (!studentId && activeStudentId) setStudentId(activeStudentId);

      const [reviewRows, feedbackList] = await Promise.all([
        listHomeworkReviews({ campusId: selectedCampusId, studentId: activeStudentId || undefined }),
        listFeedback({ campusId: selectedCampusId, studentId: activeStudentId || undefined }),
      ]);
      setReviews(reviewRows);
      setFeedbackRows(feedbackList);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateReview() {
    if (!selectedStudentId) return;
    await createHomeworkReview({
      studentId: selectedStudentId,
      subject,
      originalImageUrl,
      teacherComment,
    });
    setMessage("作业原图已保存，等待老师确认批改图后发布。");
    await reload();
  }

  async function onPublishReview() {
    if (!pendingReview) return;
    await publishHomeworkReview(pendingReview.id, { reviewedImageUrl, teacherComment });
    setMessage("批改图片已反馈给家长，错题已进入候选错题本。");
    await reload();
  }

  async function onPublishFeedback() {
    if (!selectedStudentId) return;
    await publishFeedback({ studentId: selectedStudentId, behavior, homework, knowledge });
    setMessage("今日三类点评已发布，家长端可查看总结反馈。");
    await reload();
  }

  function logout() {
    clearSession();
    router.replace("/login");
  }

  if (!user) {
    return <main className="min-h-screen bg-serenity-bg p-8 text-serenity-muted">正在加载作业反馈...</main>;
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
              <h1 className="mt-3 text-3xl font-semibold">作业批改与今日点评</h1>
              <p className="mt-2 text-sm text-serenity-muted">拍照留存原图，确认批改图后反馈家长，并沉淀错题候选。</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={selectedCampusId} onChange={(event) => { setCampusId(event.target.value); setClassId(""); setStudentId(""); }}>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>{campus.name}</option>
                ))}
              </select>
              <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={selectedClassId} onChange={(event) => { setClassId(event.target.value); setStudentId(""); }}>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={selectedStudentId} onChange={(event) => setStudentId(event.target.value)}>
                {students.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <button onClick={() => void reload()} className="flex h-11 items-center gap-2 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft">
                <RefreshCcw className="h-4 w-4" />
                刷新
              </button>
              <button onClick={logout} className="flex h-11 items-center gap-2 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft">
                <LogOut className="h-4 w-4" />
                退出
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="grid gap-5">
            <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">拍照批改</h2>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-serenity-muted">
                  科目
                  <input className="h-11 rounded-2xl bg-serenity-bg px-4 text-serenity-ink shadow-insetSoft outline-none" value={subject} onChange={(event) => setSubject(event.target.value)} />
                </label>
                <label className="grid gap-2 text-sm text-serenity-muted">
                  老师点评
                  <input className="h-11 rounded-2xl bg-serenity-bg px-4 text-serenity-ink shadow-insetSoft outline-none" value={teacherComment} onChange={(event) => setTeacherComment(event.target.value)} />
                </label>
                <label className="grid gap-2 text-sm text-serenity-muted">
                  作业原图地址
                  <input className="h-11 rounded-2xl bg-serenity-bg px-4 text-serenity-ink shadow-insetSoft outline-none" value={originalImageUrl} onChange={(event) => setOriginalImageUrl(event.target.value)} />
                </label>
                <label className="grid gap-2 text-sm text-serenity-muted">
                  批改图片地址
                  <input className="h-11 rounded-2xl bg-serenity-bg px-4 text-serenity-ink shadow-insetSoft outline-none" value={reviewedImageUrl} onChange={(event) => setReviewedImageUrl(event.target.value)} />
                </label>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={() => void onCreateReview()} disabled={!selectedStudentId} className="flex h-11 items-center gap-2 rounded-2xl bg-serenity-blue px-4 text-sm font-semibold text-white shadow-neumorphic disabled:bg-serenity-muted">
                  <ImageIcon className="h-4 w-4" />
                  保存作业原图
                </button>
                <button onClick={() => void onPublishReview()} disabled={!pendingReview} className="flex h-11 items-center gap-2 rounded-2xl bg-serenity-bg px-4 text-sm font-semibold shadow-insetSoft disabled:text-serenity-muted">
                  <CheckCircle2 className="h-4 w-4" />
                  确认批改并反馈
                </button>
              </div>
            </section>

            <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center gap-3">
                <MessageSquareText className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">今日点评反馈</h2>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm text-serenity-muted">
                  行为表现
                  <textarea className="min-h-28 rounded-2xl bg-serenity-bg p-4 text-serenity-ink shadow-insetSoft outline-none" value={behavior} onChange={(event) => setBehavior(event.target.value)} />
                </label>
                <label className="grid gap-2 text-sm text-serenity-muted">
                  作业完成
                  <textarea className="min-h-28 rounded-2xl bg-serenity-bg p-4 text-serenity-ink shadow-insetSoft outline-none" value={homework} onChange={(event) => setHomework(event.target.value)} />
                </label>
                <label className="grid gap-2 text-sm text-serenity-muted">
                  知识掌握
                  <textarea className="min-h-28 rounded-2xl bg-serenity-bg p-4 text-serenity-ink shadow-insetSoft outline-none" value={knowledge} onChange={(event) => setKnowledge(event.target.value)} />
                </label>
              </div>
              <button onClick={() => void onPublishFeedback()} disabled={!selectedStudentId} className="mt-5 flex h-11 items-center gap-2 rounded-2xl bg-serenity-blue px-4 text-sm font-semibold text-white shadow-neumorphic disabled:bg-serenity-muted">
                <FileText className="h-4 w-4" />
                发布今日点评
              </button>
            </section>
          </div>

          <aside className="grid content-start gap-5">
            <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpenCheck className="h-5 w-5 text-serenity-blue" />
                  <h2 className="text-xl font-semibold">作业记录</h2>
                </div>
                <span className="text-sm text-serenity-muted">{loading ? "加载中" : `${reviews.length} 条`}</span>
              </div>
              <div className="mt-5 grid gap-3">
                {reviews.map((item) => (
                  <article key={item.id} className="rounded-3xl bg-serenity-bg p-4 shadow-insetSoft">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{item.subject || "未填科目"}</div>
                      <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-serenity-muted">{statusLabels[item.status]}</span>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-serenity-muted">{item.teacherComment || "暂无点评"}</div>
                    <div className="mt-3 text-xs text-serenity-muted">图片 {item.images?.length ?? 0} 张 · {new Date(item.createdAt).toLocaleString("zh-CN")}</div>
                  </article>
                ))}
                {!reviews.length ? <div className="rounded-3xl bg-serenity-bg p-6 text-center text-sm text-serenity-muted shadow-insetSoft">当前学生暂无作业记录</div> : null}
              </div>
            </section>

            <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <h2 className="text-xl font-semibold">最近点评</h2>
              <div className="mt-5 grid gap-3">
                {feedbackRows.slice(0, 3).map((item) => (
                  <article key={item.id} className="rounded-3xl bg-serenity-bg p-4 text-sm leading-6 text-serenity-muted shadow-insetSoft">
                    <div>行为：{item.behavior}</div>
                    <div>作业：{item.homework}</div>
                    <div>掌握：{item.knowledge}</div>
                  </article>
                ))}
                {!feedbackRows.length ? <div className="rounded-3xl bg-serenity-bg p-6 text-center text-sm text-serenity-muted shadow-insetSoft">暂无今日点评</div> : null}
              </div>
            </section>

            {message ? <div className="rounded-3xl bg-serenity-surface p-4 text-sm text-serenity-muted shadow-neumorphic">{message}</div> : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
