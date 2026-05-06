"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  Camera,
  CheckCircle2,
  Download,
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
  MistakeItem,
  PracticeSheetItem,
  StudentItem,
  createHomeworkReview,
  downloadPracticeSheet,
  generateFeedbackDraft,
  generatePracticeSheet,
  generateSimilarQuestions,
  listClasses,
  listFeedback,
  listHomeworkReviews,
  listMistakes,
  listPracticeSheets,
  listStudents,
  publishFeedback,
  publishHomeworkReview,
  updateMistakeStatus,
  updateSimilarQuestionStatus,
  uploadImage,
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
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [practiceSheets, setPracticeSheets] = useState<PracticeSheetItem[]>([]);
  const [campusId, setCampusId] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("数学");
  const [originalImageUrl, setOriginalImageUrl] = useState("s3://dev/homework/original.jpg");
  const [reviewedImageUrl, setReviewedImageUrl] = useState("s3://dev/homework/reviewed.jpg");
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [reviewedFile, setReviewedFile] = useState<File | null>(null);
  const [teacherComment, setTeacherComment] = useState("作业已批改，错题已标记，请回家后订正。");
  const [behavior, setBehavior] = useState("上课专注，能主动跟进老师提醒。");
  const [homework, setHomework] = useState("今日作业按时完成，书写较整洁。");
  const [knowledge, setKnowledge] = useState("计算基础稳定，应用题审题还需加强。");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [draftingFeedback, setDraftingFeedback] = useState(false);

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

      const [reviewRows, feedbackList, sheetRows] = await Promise.all([
        listHomeworkReviews({ campusId: selectedCampusId, studentId: activeStudentId || undefined }),
        listFeedback({ campusId: selectedCampusId, studentId: activeStudentId || undefined }),
        listPracticeSheets({ campusId: selectedCampusId, studentId: activeStudentId || undefined }),
      ]);
      const mistakeRows = activeStudentId ? await listMistakes({ campusId: selectedCampusId, studentId: activeStudentId }) : [];
      setReviews(reviewRows);
      setFeedbackRows(feedbackList);
      setPracticeSheets(sheetRows);
      setMistakes(mistakeRows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateReview() {
    if (!selectedStudentId) return;
    const imageUrl = await uploadSelectedImage("homework_original", originalFile, originalImageUrl);
    await createHomeworkReview({
      studentId: selectedStudentId,
      subject,
      originalImageUrl: imageUrl,
      teacherComment,
    });
    setMessage("作业原图已保存，等待老师确认批改图后发布。");
    await reload();
  }

  async function onPublishReview() {
    if (!pendingReview) return;
    const imageUrl = await uploadSelectedImage("homework_reviewed", reviewedFile, reviewedImageUrl, pendingReview.id);
    await publishHomeworkReview(pendingReview.id, { reviewedImageUrl: imageUrl, teacherComment });
    setMessage("批改图片已反馈给家长，错题已进入候选错题本。");
    await reload();
  }

  async function uploadSelectedImage(
    type: "homework_original" | "homework_reviewed",
    file: File | null,
    fallbackUrl: string,
    businessId?: string,
  ) {
    if (!file) {
      return fallbackUrl;
    }
    const uploaded = await uploadImage({
      file,
      campusId: selectedCampusId,
      studentId: selectedStudentId,
      type,
      businessType: "homework_review",
      businessId,
    });
    return `file:${uploaded.id}`;
  }

  async function onPublishFeedback() {
    if (!selectedStudentId) return;
    await publishFeedback({ studentId: selectedStudentId, behavior, homework, knowledge });
    setMessage("今日三类点评已发布，家长端可查看总结反馈。");
    await reload();
  }

  async function onGenerateFeedbackDraft() {
    if (!selectedStudentId) return;
    setDraftingFeedback(true);
    try {
      const draft = await generateFeedbackDraft({
        studentId: selectedStudentId,
        reviewId: pendingReview?.id,
        teacherNote: teacherComment,
      });
      setBehavior(draft.behavior);
      setHomework(draft.homework);
      setKnowledge(draft.knowledge);
      setMessage("AI draft generated. Please review and publish after confirmation.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to generate AI draft");
    } finally {
      setDraftingFeedback(false);
    }
  }

  async function onConfirmMistake(mistake: MistakeItem) {
    await updateMistakeStatus(mistake.id, { status: "confirmed", knowledgePoint: mistake.knowledgePoint ?? "待确认知识点" });
    setMessage("错题已确认进入错题本");
    await reload();
  }

  async function onGenerateSimilar(mistake: MistakeItem) {
    await generateSimilarQuestions(mistake.id, 3);
    setMessage("已生成同类题候选");
    await reload();
  }

  async function onSelectSimilarQuestion(questionId: string) {
    await updateSimilarQuestionStatus(questionId, "selected");
    setMessage("同类题已选入练习单");
    await reload();
  }

  async function onDismissSimilarQuestion(questionId: string) {
    await updateSimilarQuestionStatus(questionId, "dismissed");
    setMessage("已移除不合适的同类题");
    await reload();
  }

  async function onGeneratePracticeSheet() {
    const selectedIds = mistakes.flatMap((item) => item.similarQuestions?.filter((question) => question.status === "selected").map((question) => question.id) ?? []);
    if (!selectedStudentId || selectedIds.length === 0) {
      setMessage("请先选择同类题");
      return;
    }
    const sheet = await generatePracticeSheet({
      studentId: selectedStudentId,
      title: "错题巩固练习单",
      similarQuestionIds: selectedIds,
    });
    setMessage(`练习单已生成：${sheet.title ?? sheet.id}`);
    await reload();
  }

  async function onDownloadPracticeSheet(sheet: PracticeSheetItem) {
    const { blob, filename } = await downloadPracticeSheet(sheet.id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`已下载：${filename}`);
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
                <label className="grid gap-2 text-sm text-serenity-muted">
                  上传作业原图
                  <input className="rounded-2xl bg-serenity-bg px-4 py-3 text-sm shadow-insetSoft file:mr-3 file:rounded-xl file:border-0 file:bg-serenity-blue file:px-3 file:py-2 file:text-white" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setOriginalFile(event.target.files?.[0] ?? null)} />
                </label>
                <label className="grid gap-2 text-sm text-serenity-muted">
                  上传批改图片
                  <input className="rounded-2xl bg-serenity-bg px-4 py-3 text-sm shadow-insetSoft file:mr-3 file:rounded-xl file:border-0 file:bg-serenity-blue file:px-3 file:py-2 file:text-white" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setReviewedFile(event.target.files?.[0] ?? null)} />
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
              <button onClick={() => void onGenerateFeedbackDraft()} disabled={!selectedStudentId || draftingFeedback} className="mt-5 mr-3 inline-flex h-11 items-center gap-2 rounded-2xl bg-serenity-bg px-4 text-sm font-semibold shadow-insetSoft disabled:text-serenity-muted">
                <MessageSquareText className="h-4 w-4" />
                {draftingFeedback ? "AI generating" : "AI draft"}
              </button>
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

            <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <h2 className="text-xl font-semibold">错题候选</h2>
              <button onClick={() => void onGeneratePracticeSheet()} className="mt-4 w-full rounded-2xl bg-serenity-blue px-4 py-3 text-sm font-semibold text-white shadow-neumorphic">
                生成练习单
              </button>
              <div className="mt-4 grid gap-2">
                {practiceSheets.slice(0, 3).map((sheet) => (
                  <article key={sheet.id} className="rounded-2xl bg-white/70 p-3 text-sm text-serenity-muted">
                    <div className="font-semibold text-serenity-ink">{sheet.title ?? "错题练习单"}</div>
                    <div className="mt-1 text-xs">{new Date(sheet.createdAt).toLocaleString("zh-CN")} · {sheet.status === "ready" ? "可下载" : sheet.status}</div>
                    <button onClick={() => void onDownloadPracticeSheet(sheet)} disabled={sheet.status !== "ready"} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-serenity-bg px-3 py-2 text-xs font-semibold text-serenity-ink shadow-insetSoft disabled:text-serenity-muted">
                      <Download className="h-3.5 w-3.5" />
                      下载 Word
                    </button>
                  </article>
                ))}
              </div>
              <div className="mt-5 grid gap-3">
                {mistakes.slice(0, 6).map((item) => (
                  <article key={item.id} className="rounded-3xl bg-serenity-bg p-4 text-sm leading-6 text-serenity-muted shadow-insetSoft">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-serenity-ink">{item.subject || "作业错题"}</span>
                      <span>{item.status === "confirmed" ? "已确认" : item.status === "dismissed" ? "已忽略" : "候选"}</span>
                    </div>
                    <div className="mt-2">{item.question || "待老师确认错题内容"}</div>
                    <div className="mt-2">同类题：{item.similarQuestions?.length ?? 0} 条</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => void onConfirmMistake(item)} className="rounded-2xl bg-serenity-blue px-3 py-2 text-xs font-semibold text-white">确认错题</button>
                      <button onClick={() => void onGenerateSimilar(item)} className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold text-serenity-ink">生成同类题</button>
                    </div>
                    {item.similarQuestions?.length ? (
                      <div className="mt-3 grid gap-2">
                        {item.similarQuestions.slice(0, 3).map((question) => (
                          <div key={question.id} className="rounded-2xl bg-white/70 p-3">
                            <div>{question.question}</div>
                            <button onClick={() => void onSelectSimilarQuestion(question.id)} className="mt-2 rounded-xl bg-serenity-bg px-3 py-1 text-xs font-semibold text-serenity-ink shadow-insetSoft">
                              {question.status === "selected" ? "已选择" : "选择"}
                            </button>
                            <button onClick={() => void onDismissSimilarQuestion(question.id)} className="ml-2 mt-2 rounded-xl bg-white px-3 py-1 text-xs font-semibold text-serenity-muted shadow-insetSoft">
                              移除
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
                {!mistakes.length ? <div className="rounded-3xl bg-serenity-bg p-6 text-center text-sm text-serenity-muted shadow-insetSoft">暂无错题候选</div> : null}
              </div>
            </section>

            {message ? <div className="rounded-3xl bg-serenity-surface p-4 text-sm text-serenity-muted shadow-neumorphic">{message}</div> : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
