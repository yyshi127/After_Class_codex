"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, Clock3, LogOut, RefreshCcw, School, Users } from "lucide-react";
import {
  ClassItem,
  StudentAttendanceItem,
  StudentItem,
  TeacherAttendanceItem,
  checkInStudent,
  listClasses,
  listStudentAttendance,
  listStudents,
  listTeacherAttendance,
  teacherCheckIn,
  teacherCheckOut,
} from "../../../src/api-client";
import { AuthUser, clearSession, getStoredToken, getStoredUser, loadMe, saveSession } from "../../../src/auth-client";

const attendanceLabels: Record<string, string> = {
  pending: "未到",
  checked_in: "已到",
  checked_out: "已离校",
  leave: "请假",
  absent: "缺勤",
};

const billingCycleLabels: Record<string, string> = {
  monthly: "月缴",
  semester: "学期缴",
};

export default function TeacherTodayPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<StudentAttendanceItem[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendanceItem[]>([]);
  const [campusId, setCampusId] = useState("");
  const [classId, setClassId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const campuses = useMemo(() => user?.campuses ?? [], [user]);
  const selectedCampusId = campusId || campuses[0]?.id || "";
  const selectedClassId = classId || classes[0]?.id || "";

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
  }, [selectedCampusId, selectedClassId]);

  async function reload() {
    setLoading(true);
    setMessage("");
    try {
      const classRows = await listClasses(selectedCampusId);
      setClasses(classRows);
      const activeClassId = selectedClassId || classRows[0]?.id || "";
      if (!classId && activeClassId) setClassId(activeClassId);

      const [studentRows, attendanceRows, teacherRows] = await Promise.all([
        activeClassId ? listStudents({ campusId: selectedCampusId, classId: activeClassId, status: "active" }) : [],
        listStudentAttendance({ campusId: selectedCampusId }),
        listTeacherAttendance(selectedCampusId),
      ]);
      setStudents(studentRows);
      setStudentAttendance(attendanceRows);
      setTeacherAttendance(teacherRows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function onCheckInStudent(student: StudentItem) {
    await checkInStudent({
      studentId: student.id,
      photoUrl: `s3://dev/checkin/${student.id}-${Date.now()}.jpg`,
    });
    setMessage(`${student.name} 已到校，已通知家长`);
    await reload();
  }

  async function onTeacherCheckIn() {
    await teacherCheckIn({ campusId: selectedCampusId, note: "老师端上班签到" });
    setMessage("老师上班签到成功");
    await reload();
  }

  async function onTeacherCheckOut() {
    await teacherCheckOut({ campusId: selectedCampusId, note: "老师端下班签退" });
    setMessage("老师下班签退成功");
    await reload();
  }

  function latestStatus(studentId: string) {
    const latest = studentAttendance.find((item) => item.studentId === studentId);
    return latest?.status ?? "pending";
  }

  function logout() {
    clearSession();
    router.replace("/login");
  }

  if (!user) {
    return <main className="min-h-screen bg-serenity-bg p-8 text-serenity-muted">正在加载老师工作台...</main>;
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
              <h1 className="mt-3 text-3xl font-semibold">老师今日工作台</h1>
              <p className="mt-2 text-sm text-serenity-muted">处理到托签到、老师考勤和班级学生状态。</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={selectedCampusId} onChange={(event) => { setCampusId(event.target.value); setClassId(""); }}>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>{campus.name}</option>
                ))}
              </select>
              <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={selectedClassId} onChange={(event) => setClassId(event.target.value)}>
                {classes.map((item) => (
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

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">班级学生状态</h2>
              </div>
              <span className="text-sm text-serenity-muted">{loading ? "加载中" : `${students.length} 人`}</span>
            </div>

            <div className="mt-5 grid gap-3">
              {students.map((student) => {
                const status = latestStatus(student.id);
                return (
                  <article key={student.id} className="grid gap-3 rounded-3xl bg-serenity-bg p-4 shadow-insetSoft md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-lg font-semibold">{student.name}</span>
                        <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-serenity-muted">{student.grade || "未填年级"}</span>
                        <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-serenity-muted">{student.class?.name || "未分班"}</span>
                        {student.currentService ? (
                          <span className="rounded-full bg-serenity-blue px-3 py-1 text-xs font-semibold text-white">
                            {student.currentService.serviceType.name}
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-serenity-muted">未配置托管</span>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-serenity-muted">{student.schoolName || "未填写学校"} · {attendanceLabels[status]}</div>
                      {student.currentService ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-serenity-muted">
                          <span className="rounded-full bg-white/70 px-3 py-1">
                            {billingCycleLabels[student.currentService.billingCycle]} · 有效期至 {formatDate(student.currentService.validTo)}
                          </span>
                          {serviceExpiryHint(student.currentService.validTo) ? (
                            <span className="rounded-full bg-white px-3 py-1 font-semibold text-serenity-ink">
                              {serviceExpiryHint(student.currentService.validTo)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <button
                      onClick={() => void onCheckInStudent(student)}
                      disabled={status === "checked_in"}
                      className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-serenity-blue px-4 text-sm font-semibold text-white shadow-neumorphic disabled:bg-serenity-muted"
                    >
                      <Camera className="h-4 w-4" />
                      {status === "checked_in" ? "已到校" : "拍照签到"}
                    </button>
                  </article>
                );
              })}
              {!students.length ? <div className="rounded-3xl bg-serenity-bg p-8 text-center text-sm text-serenity-muted shadow-insetSoft">当前班级暂无学生</div> : null}
            </div>
          </div>

          <aside className="grid gap-5 content-start">
            <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">老师考勤</h2>
              </div>
              <div className="mt-5 grid gap-3">
                <button onClick={() => void onTeacherCheckIn()} className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-serenity-blue px-4 text-sm font-semibold text-white shadow-neumorphic">
                  <CheckCircle2 className="h-4 w-4" />
                  上班签到
                </button>
                <button onClick={() => void onTeacherCheckOut()} className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-serenity-bg px-4 text-sm font-semibold shadow-insetSoft">
                  下班签退
                </button>
              </div>
              <div className="mt-5 grid gap-2 text-sm text-serenity-muted">
                {teacherAttendance.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-2xl bg-serenity-bg px-4 py-3 shadow-insetSoft">
                    {item.status === "checked_in" ? "上班签到" : "下班签退"} · {new Date(item.occurredAt).toLocaleString("zh-CN")}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center gap-3">
                <School className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">今日流程</h2>
              </div>
              <div className="mt-5 grid gap-3 text-sm text-serenity-muted">
                <div className="rounded-2xl bg-serenity-bg px-4 py-3 shadow-insetSoft">接到校：拍照签到并通知家长</div>
                <div className="rounded-2xl bg-serenity-bg px-4 py-3 shadow-insetSoft">作业：后续接入拍照批改</div>
                <div className="rounded-2xl bg-serenity-bg px-4 py-3 shadow-insetSoft">点评：后续填写三类反馈</div>
                <div className="rounded-2xl bg-serenity-bg px-4 py-3 shadow-insetSoft">签退：后续记录离校状态</div>
              </div>
            </section>

            {message ? <div className="rounded-3xl bg-serenity-surface p-4 text-sm text-serenity-muted shadow-neumorphic">{message}</div> : null}
          </aside>
        </section>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function serviceExpiryHint(validTo: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(validTo);
  end.setHours(0, 0, 0, 0);
  const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
  if (days < 0) return `已到期 ${Math.abs(days)} 天`;
  if (days === 0) return "今天到期";
  if (days <= 7) return `${days} 天后到期`;
  return "";
}
