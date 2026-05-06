"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, CalendarCheck2, Home, Image as ImageIcon, LogOut, MessageCircle, RefreshCcw, UserRound } from "lucide-react";
import {
  FeedbackItem,
  HomeworkReviewItem,
  LeaveRequestItem,
  NotificationItem,
  ServiceSummary,
  StudentAttendanceItem,
  StudentItem,
  getFileSignedUrl,
  getServiceSummary,
  listFeedback,
  listHomeworkReviews,
  listLeaveRequests,
  listNotifications,
  listStudentAttendance,
  listStudents,
} from "../../../src/api-client";
import { AuthUser, clearSession, getStoredToken, getStoredUser, loadMe, saveSession } from "../../../src/auth-client";

const attendanceLabels: Record<string, string> = {
  pending: "未到校",
  checked_in: "已到校",
  checked_out: "已离校",
  leave: "请假",
  absent: "缺勤",
};

const reviewStatusLabels: Record<HomeworkReviewItem["status"], string> = {
  pending: "待老师确认",
  completed: "已反馈",
  needs_correction: "需订正",
};

export default function ParentHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [attendanceRows, setAttendanceRows] = useState<StudentAttendanceItem[]>([]);
  const [reviews, setReviews] = useState<HomeworkReviewItem[]>([]);
  const [feedbackRows, setFeedbackRows] = useState<FeedbackItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [leaveRows, setLeaveRows] = useState<LeaveRequestItem[]>([]);
  const [serviceSummary, setServiceSummary] = useState<ServiceSummary | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const campuses = useMemo(() => user?.campuses ?? [], [user]);
  const campusId = campuses[0]?.id ?? "";
  const activeStudentId = selectedStudentId || students[0]?.id || "";
  const activeStudent = students.find((item) => item.id === activeStudentId);
  const latestAttendance = attendanceRows[0];
  const latestFeedback = feedbackRows[0];

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
        if (freshUser.role !== "guardian") {
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
    if (!campusId) return;
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId, activeStudentId]);

  async function reload() {
    setLoading(true);
    setMessage("");
    try {
      const studentRows = await listStudents({ campusId, status: "active" });
      setStudents(studentRows);
      const studentId = activeStudentId || studentRows[0]?.id || "";
      if (!selectedStudentId && studentId) setSelectedStudentId(studentId);

      if (!studentId) {
        setAttendanceRows([]);
        setReviews([]);
        setFeedbackRows([]);
        setNotifications([]);
        setLeaveRows([]);
        setServiceSummary(null);
        return;
      }

      const [attendanceList, reviewList, feedbackList, notificationList, leaveList, serviceInfo] = await Promise.all([
        listStudentAttendance({ campusId, studentId }),
        listHomeworkReviews({ campusId, studentId }),
        listFeedback({ campusId, studentId }),
        listNotifications({ campusId, studentId }),
        listLeaveRequests({ campusId, studentId }),
        getServiceSummary(studentId),
      ]);
      setAttendanceRows(attendanceList);
      setReviews(reviewList);
      setFeedbackRows(feedbackList);
      setNotifications(notificationList);
      setLeaveRows(leaveList);
      setServiceSummary(serviceInfo);
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
    return <main className="min-h-screen bg-serenity-bg p-6 text-serenity-muted">正在加载家长端...</main>;
  }

  return (
    <main className="min-h-screen bg-serenity-bg pb-24 text-serenity-ink">
      <div className="mx-auto max-w-md px-4 py-5">
        <header className="rounded-[32px] bg-serenity-surface p-5 shadow-neumorphic">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-serenity-muted">家长端</div>
              <h1 className="mt-1 text-2xl font-semibold">{activeStudent?.name ?? "孩子"}的托管动态</h1>
              <p className="mt-2 text-sm leading-6 text-serenity-muted">到校状态、作业照片、批改结果和老师点评集中查看。</p>
            </div>
            <button onClick={logout} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-serenity-bg shadow-insetSoft" aria-label="退出">
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 flex gap-3">
            <select className="min-w-0 flex-1 rounded-2xl bg-serenity-bg px-4 py-3 text-sm shadow-insetSoft outline-none" value={activeStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </select>
            <button onClick={() => void reload()} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-serenity-bg shadow-insetSoft" aria-label="刷新">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
          {students.length > 1 ? <div className="mt-3 text-xs text-serenity-muted">已支持多个孩子切换查看。</div> : null}
        </header>

        <section className="mt-5 grid gap-4">
          <article className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
            <div className="flex items-center gap-3">
              <CalendarCheck2 className="h-5 w-5 text-serenity-blue" />
              <h2 className="text-lg font-semibold">今日状态</h2>
            </div>
            <div className="mt-4 rounded-3xl bg-serenity-bg p-4 shadow-insetSoft">
              <div className="text-2xl font-semibold">{attendanceLabels[latestAttendance?.status ?? "pending"]}</div>
              <div className="mt-2 text-sm text-serenity-muted">
                {latestAttendance ? new Date(latestAttendance.occurredAt).toLocaleString("zh-CN") : "老师签到后会自动同步到这里"}
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {attendanceRows.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-3xl bg-serenity-bg p-4 shadow-insetSoft">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{attendanceLabels[item.status] ?? item.status}</span>
                    <span className="text-xs text-serenity-muted">{new Date(item.occurredAt).toLocaleString("zh-CN")}</span>
                  </div>
                  {item.photoUrl ? (
                    <div className="mt-3">
                      <div className="mb-2 flex items-center gap-2 text-xs text-serenity-muted">
                        <ImageIcon className="h-3.5 w-3.5" />
                        到托照片
                      </div>
                      <AttendancePhoto url={item.photoUrl} />
                    </div>
                  ) : null}
                </div>
              ))}
              {!attendanceRows.length ? <div className="rounded-3xl bg-serenity-bg p-6 text-center text-sm text-serenity-muted shadow-insetSoft">暂无考勤记录</div> : null}
            </div>
          </article>

          <article className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <BookOpenCheck className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-lg font-semibold">作业照片与批改</h2>
              </div>
              <span className="text-sm text-serenity-muted">{loading ? "加载中" : `${reviews.length} 条`}</span>
            </div>
            <div className="mt-4 grid gap-3">
              {reviews.map((review) => (
                <section key={review.id} className="rounded-3xl bg-serenity-bg p-4 shadow-insetSoft">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{review.subject || "作业"}</div>
                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-serenity-muted">{reviewStatusLabels[review.status]}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-serenity-muted">{review.teacherComment || "老师暂未填写批改说明"}</p>
                  <div className="mt-3 grid gap-2">
                    {(review.images ?? []).map((image) => (
                      <div key={image.id} className="rounded-2xl bg-white/60 p-3 text-sm text-serenity-muted">
                        <div className="flex items-center gap-2 font-medium text-serenity-ink">
                          <ImageIcon className="h-4 w-4 text-serenity-blue" />
                          {image.type === "original" ? "作业原图" : image.type === "reviewed" ? "老师批改图" : "AI 圈错图"}
                        </div>
                        <HomeworkImage url={image.url} />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              {!reviews.length ? <div className="rounded-3xl bg-serenity-bg p-6 text-center text-sm text-serenity-muted shadow-insetSoft">暂无作业反馈</div> : null}
            </div>
          </article>

          <article className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-serenity-blue" />
              <h2 className="text-lg font-semibold">今日点评</h2>
            </div>
            {latestFeedback ? (
              <div className="mt-4 grid gap-3 text-sm leading-6 text-serenity-muted">
                <div className="rounded-3xl bg-serenity-bg p-4 shadow-insetSoft">
                  <div>
                    <span className="font-semibold text-serenity-ink">点评老师：</span>
                    {latestFeedback.teacher?.name ?? "老师"}
                  </div>
                  <div className="mt-1">
                    <span className="font-semibold text-serenity-ink">发布时间：</span>
                    {latestFeedback.publishedAt ? new Date(latestFeedback.publishedAt).toLocaleString("zh-CN") : "待发布"}
                  </div>
                </div>
                <div className="rounded-3xl bg-serenity-bg p-4 shadow-insetSoft"><span className="font-semibold text-serenity-ink">行为表现：</span>{latestFeedback.behavior}</div>
                <div className="rounded-3xl bg-serenity-bg p-4 shadow-insetSoft"><span className="font-semibold text-serenity-ink">作业完成：</span>{latestFeedback.homework}</div>
                <div className="rounded-3xl bg-serenity-bg p-4 shadow-insetSoft"><span className="font-semibold text-serenity-ink">知识掌握：</span>{latestFeedback.knowledge}</div>
              </div>
            ) : (
              <div className="mt-4 rounded-3xl bg-serenity-bg p-6 text-center text-sm text-serenity-muted shadow-insetSoft">老师发布后可查看三类反馈</div>
            )}
          </article>

          <article className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-serenity-blue" />
              <h2 className="text-lg font-semibold">消息通知</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {notifications.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-3xl bg-serenity-bg p-4 shadow-insetSoft">
                  <div className="font-semibold">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-serenity-muted">{item.content}</div>
                  <div className="mt-2 text-xs text-serenity-muted">{new Date(item.createdAt).toLocaleString("zh-CN")}</div>
                </div>
              ))}
              {!notifications.length ? <div className="rounded-3xl bg-serenity-bg p-6 text-center text-sm text-serenity-muted shadow-insetSoft">暂无新消息</div> : null}
            </div>
          </article>

          <article className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
            <div className="flex items-center gap-3">
              <UserRound className="h-5 w-5 text-serenity-blue" />
              <h2 className="text-lg font-semibold">我的与服务信息</h2>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-3xl bg-serenity-bg p-4 text-sm leading-6 text-serenity-muted shadow-insetSoft">
                <div><span className="font-semibold text-serenity-ink">孩子姓名：</span>{activeStudent?.name ?? "待确认"}</div>
                <div><span className="font-semibold text-serenity-ink">年级班级：</span>{activeStudent?.grade ?? "未填"} · {activeStudent?.class?.name ?? "未分班"}</div>
                <div><span className="font-semibold text-serenity-ink">就读学校：</span>{activeStudent?.schoolName ?? "未填写"}</div>
                <div><span className="font-semibold text-serenity-ink">身份证号：</span>{activeStudent?.idCardNoMasked ?? "未录入"}</div>
              </div>
              <div className="rounded-3xl bg-serenity-bg p-4 text-sm leading-6 text-serenity-muted shadow-insetSoft">
                <div><span className="font-semibold text-serenity-ink">家长资料：</span></div>
                {activeStudent?.guardians?.length ? (
                  activeStudent.guardians.map((guardian) => (
                    <div key={guardian.id}>{guardian.name}{guardian.relation ? `（${guardian.relation}）` : ""} · {guardian.phone}</div>
                  ))
                ) : (
                  <div>暂无绑定家长资料</div>
                )}
              </div>
              <div className="rounded-3xl bg-serenity-bg p-4 text-sm leading-6 text-serenity-muted shadow-insetSoft">
                <div><span className="font-semibold text-serenity-ink">托管类型：</span>{serviceSummary?.serviceType?.name ?? "待确认"}</div>
                <div><span className="font-semibold text-serenity-ink">服务有效期：</span>{serviceSummary?.validTo ? `至 ${new Date(serviceSummary.validTo).toLocaleDateString("zh-CN")}` : "待确认"}</div>
                <div className="mt-2">{serviceSummary?.renewHint ?? "当前页面仅展示服务有效期和续费提示入口。"}</div>
                <div className="mt-2">不展示余额、欠费金额、班级核算或机构收入。</div>
              </div>
              <div className="rounded-3xl bg-serenity-bg p-4 text-sm leading-6 text-serenity-muted shadow-insetSoft">
                <div className="font-semibold text-serenity-ink">请假记录</div>
                <div className="mt-2 grid gap-2">
                  {leaveRows.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-2xl bg-white/70 p-3">
                      {item.type} · {new Date(item.startsAt).toLocaleDateString("zh-CN")} 至 {new Date(item.endsAt).toLocaleDateString("zh-CN")} · {leaveStatusLabel(item.status)}
                    </div>
                  ))}
                  {!leaveRows.length ? <div>暂无请假记录</div> : null}
                </div>
              </div>
              <div className="rounded-3xl bg-serenity-bg p-4 text-sm leading-6 text-serenity-muted shadow-insetSoft">
                消息设置：MVP 阶段默认接收到校、作业反馈、今日点评和服务到期提醒。
              </div>
            </div>
          </article>
        </section>

        {message ? <div className="mt-5 rounded-3xl bg-serenity-surface p-4 text-sm text-serenity-muted shadow-neumorphic">{message}</div> : null}
      </div>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-serenity-surface/95 px-6 py-3 shadow-neumorphic">
        <div className="grid grid-cols-4 gap-2 text-xs text-serenity-muted">
          <button className="grid justify-items-center gap-1 text-serenity-blue"><Home className="h-5 w-5" />首页</button>
          <button className="grid justify-items-center gap-1"><BookOpenCheck className="h-5 w-5" />作业</button>
          <button className="grid justify-items-center gap-1"><MessageCircle className="h-5 w-5" />消息</button>
          <button className="grid justify-items-center gap-1"><UserRound className="h-5 w-5" />我的</button>
        </div>
      </nav>
    </main>
  );
}

function HomeworkImage({ url }: { url: string }) {
  const [resolvedUrl, setResolvedUrl] = useState(url);

  useEffect(() => {
    if (!url.startsWith("file:")) {
      setResolvedUrl(url);
      return;
    }
    getFileSignedUrl(url.slice("file:".length))
      .then((result) => setResolvedUrl(result.signedUrl))
      .catch(() => setResolvedUrl(""));
  }, [url]);

  if (!resolvedUrl) {
    return <div className="mt-2 rounded-2xl bg-white/70 p-4 text-xs text-serenity-muted">图片暂时无法访问</div>;
  }

  if (!resolvedUrl.startsWith("http")) {
    return <div className="mt-2 break-all text-xs">{resolvedUrl}</div>;
  }

  return (
    <img
      src={resolvedUrl}
      alt="作业图片"
      className="mt-3 aspect-[4/3] w-full rounded-2xl object-cover shadow-insetSoft"
    />
  );
}

function AttendancePhoto({ url }: { url: string }) {
  const [resolvedUrl, setResolvedUrl] = useState(url);

  useEffect(() => {
    if (!url.startsWith("file:")) {
      setResolvedUrl(url);
      return;
    }
    getFileSignedUrl(url.slice("file:".length))
      .then((result) => setResolvedUrl(result.signedUrl))
      .catch(() => setResolvedUrl(""));
  }, [url]);

  if (!resolvedUrl) {
    return <div className="rounded-2xl bg-white/70 p-3 text-xs text-serenity-muted">照片暂时无法访问</div>;
  }

  if (!resolvedUrl.startsWith("http")) {
    return <div className="rounded-2xl bg-white/70 p-3 text-xs text-serenity-muted break-all">{resolvedUrl}</div>;
  }

  return (
    <a href={resolvedUrl} target="_blank" rel="noreferrer" className="block">
      <img src={resolvedUrl} alt="到托照片" className="aspect-[4/3] w-full rounded-2xl object-cover shadow-insetSoft" />
    </a>
  );
}

function leaveStatusLabel(status: LeaveRequestItem["status"]) {
  const labels: Record<LeaveRequestItem["status"], string> = {
    pending: "待确认",
    approved: "已通过",
    rejected: "已拒绝",
    cancelled: "已取消",
  };
  return labels[status];
}
