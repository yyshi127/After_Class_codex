"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarCheck2, Camera, LogOut, RefreshCcw, UserCheck } from "lucide-react";
import {
  ClassItem,
  NotificationItem,
  StudentAttendanceItem,
  StudentItem,
  TeacherAttendanceItem,
  createManualStudentAttendance,
  createManualTeacherAttendance,
  listClasses,
  listNotifications,
  listStudentAttendance,
  listStudents,
  listTeacherAttendance,
  retryNotification,
} from "../../../src/api-client";
import { AuthUser, clearSession, getStoredToken, getStoredUser, loadMe, saveSession } from "../../../src/auth-client";

const attendanceLabels: Record<string, string> = {
  pending: "未到",
  checked_in: "已到校",
  checked_out: "已离校",
  leave: "请假",
  absent: "缺勤",
};

const notificationStatusLabels: Record<NotificationItem["status"], string> = {
  pending: "待发送",
  sent: "已发送",
  failed: "发送失败",
};

export default function AdminAttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<StudentAttendanceItem[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendanceItem[]>([]);
  const [notificationRows, setNotificationRows] = useState<NotificationItem[]>([]);
  const [campusId, setCampusId] = useState("");
  const [classId, setClassId] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [retryingNotificationId, setRetryingNotificationId] = useState("");
  const [studentManualForm, setStudentManualForm] = useState({
    studentId: "",
    status: "checked_in" as StudentAttendanceItem["status"],
    occurredAt: localDateTimeValue(),
    photoUrl: "",
  });
  const [teacherManualForm, setTeacherManualForm] = useState({
    teacherId: "",
    status: "checked_in" as TeacherAttendanceItem["status"],
    occurredAt: localDateTimeValue(),
    note: "管理员补签",
  });
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
  }, [selectedCampusId, selectedClassId, serviceTypeId]);

  async function reload() {
    setLoading(true);
    setMessage("");
    try {
      const classRows = await listClasses(selectedCampusId);
      setClasses(classRows);
      const activeClassId = selectedClassId || classRows[0]?.id || "";
      if (!classId && activeClassId) setClassId(activeClassId);
      const [studentRows, studentAttendanceRows, teacherAttendanceRows, notificationList] = await Promise.all([
        activeClassId ? listStudents({ campusId: selectedCampusId, classId: activeClassId, status: "active" }) : [],
        listStudentAttendance({
          campusId: selectedCampusId,
          classId: activeClassId || undefined,
          serviceTypeId: serviceTypeId || undefined,
        }),
        listTeacherAttendance(selectedCampusId),
        listNotifications({ campusId: selectedCampusId }),
      ]);
      setStudents(studentRows);
      setStudentAttendance(studentAttendanceRows);
      setTeacherAttendance(teacherAttendanceRows);
      setNotificationRows(notificationList);
      setStudentManualForm((prev) => ({ ...prev, studentId: prev.studentId || studentRows[0]?.id || "" }));
      setTeacherManualForm((prev) => ({ ...prev, teacherId: prev.teacherId || teacherOptionsFromClasses(classRows)[0]?.id || "" }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  function latestStudentAttendance(studentId: string) {
    return studentAttendance.find((item) => item.studentId === studentId);
  }

  const serviceTypeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const student of students) {
      const service = student.currentService?.serviceType;
      if (service) {
        map.set(service.id, service.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [students]);

  const filteredStudents = useMemo(
    () => (serviceTypeId ? students.filter((student) => student.currentService?.serviceType.id === serviceTypeId) : students),
    [serviceTypeId, students],
  );

  const teacherOptions = useMemo(() => teacherOptionsFromClasses(classes), [classes]);

  function latestArrivalNotification(studentId: string) {
    return notificationRows.find((item) => item.studentId === studentId && item.title === "孩子已到校");
  }

  async function onRetryNotification(notificationId: string) {
    setRetryingNotificationId(notificationId);
    setMessage("");
    try {
      await retryNotification(notificationId);
      await reload();
      setMessage("通知已重试");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "通知重试失败");
    } finally {
      setRetryingNotificationId("");
    }
  }

  async function onCreateManualStudentAttendance() {
    if (!studentManualForm.studentId) return;
    await createManualStudentAttendance({
      studentId: studentManualForm.studentId,
      status: studentManualForm.status,
      occurredAt: new Date(studentManualForm.occurredAt).toISOString(),
      photoUrl: studentManualForm.photoUrl || undefined,
    });
    setMessage("学生考勤已补录，并写入审计日志");
    await reload();
  }

  async function onCreateManualTeacherAttendance() {
    if (!teacherManualForm.teacherId || !selectedCampusId) return;
    await createManualTeacherAttendance({
      campusId: selectedCampusId,
      teacherId: teacherManualForm.teacherId,
      status: teacherManualForm.status,
      occurredAt: new Date(teacherManualForm.occurredAt).toISOString(),
      note: teacherManualForm.note || undefined,
    });
    setMessage("老师考勤已补签，并写入审计日志");
    await reload();
  }

  function logout() {
    clearSession();
    router.replace("/login");
  }

  if (!user) {
    return <main className="min-h-screen bg-serenity-bg p-8 text-serenity-muted">正在加载考勤管理...</main>;
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
              <h1 className="mt-3 text-3xl font-semibold">考勤管理</h1>
              <p className="mt-2 text-sm text-serenity-muted">查看学生到托状态、签到照片和老师考勤记录。</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={selectedCampusId} onChange={(event) => { setCampusId(event.target.value); setClassId(""); }}>
                {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
              </select>
              <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={selectedClassId} onChange={(event) => setClassId(event.target.value)}>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={serviceTypeId} onChange={(event) => setServiceTypeId(event.target.value)}>
                <option value="">全部托管类型</option>
                {serviceTypeOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
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
          <article className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarCheck2 className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">学生考勤</h2>
              </div>
              <span className="text-sm text-serenity-muted">{loading ? "加载中" : `${filteredStudents.length} 人`}</span>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-left text-sm">
                <thead className="text-serenity-muted">
                  <tr><th>学生</th><th>班级</th><th>状态</th><th>时间</th><th>到托照片</th><th>通知状态</th><th>操作</th></tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => {
                    const attendance = latestStudentAttendance(student.id);
                    const notification = latestArrivalNotification(student.id);
                    return (
                      <tr key={student.id} className="bg-serenity-bg shadow-insetSoft">
                        <td className="rounded-l-2xl px-4 py-3 font-semibold">{student.name}</td>
                        <td className="px-4 py-3">{student.class?.name ?? "未分班"}</td>
                        <td className="px-4 py-3">{attendanceLabels[attendance?.status ?? "pending"]}</td>
                        <td className="px-4 py-3">{attendance ? new Date(attendance.occurredAt).toLocaleString("zh-CN") : "-"}</td>
                        <td className="px-4 py-3">
                          {attendance?.photoUrl ? <span className="inline-flex items-center gap-2"><Camera className="h-4 w-4" />已上传</span> : "暂无"}
                        </td>
                        <td className="px-4 py-3">
                          {notification ? notificationStatusLabels[notification.status] : "-"}
                          {notification?.status === "failed" && notification.failReason ? (
                            <div className="mt-1 text-xs text-serenity-muted">{notification.failReason}</div>
                          ) : null}
                        </td>
                        <td className="rounded-r-2xl px-4 py-3">
                          {notification?.status === "failed" ? (
                            <button
                              onClick={() => void onRetryNotification(notification.id)}
                              disabled={retryingNotificationId === notification.id}
                              className="rounded-xl bg-white px-3 py-1.5 text-xs text-serenity-ink shadow-insetSoft disabled:opacity-60"
                            >
                              {retryingNotificationId === notification.id ? "重试中..." : "重试通知"}
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredStudents.length ? <div className="rounded-3xl bg-serenity-bg p-8 text-center text-sm text-serenity-muted shadow-insetSoft">当前筛选条件暂无学生</div> : null}
            </div>
          </article>

          <aside className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-serenity-blue" />
              <h2 className="text-xl font-semibold">老师考勤</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {teacherAttendance.slice(0, 12).map((item) => (
                <div key={item.id} className="rounded-3xl bg-serenity-bg p-4 text-sm shadow-insetSoft">
                  <div className="font-semibold">{item.teacher?.name ?? item.teacherId}</div>
                  <div className="mt-2 text-serenity-muted">{item.status === "checked_in" ? "上班签到" : "下班签退"} · {new Date(item.occurredAt).toLocaleString("zh-CN")}</div>
                  {item.note ? <div className="mt-1 text-serenity-muted">{item.note}</div> : null}
                </div>
              ))}
              {!teacherAttendance.length ? <div className="rounded-3xl bg-serenity-bg p-8 text-center text-sm text-serenity-muted shadow-insetSoft">暂无老师考勤记录</div> : null}
            </div>
          </aside>
        </section>

        {user.role === "admin" ? (
          <section className="grid gap-5 xl:grid-cols-2">
            <article className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <h2 className="text-xl font-semibold">补录学生考勤</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={studentManualForm.studentId} onChange={(event) => setStudentManualForm({ ...studentManualForm, studentId: event.target.value })}>
                  <option value="">选择学生</option>
                  {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
                </select>
                <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={studentManualForm.status} onChange={(event) => setStudentManualForm({ ...studentManualForm, status: event.target.value as StudentAttendanceItem["status"] })}>
                  <option value="checked_in">已到校</option>
                  <option value="checked_out">已离校</option>
                  <option value="leave">请假</option>
                  <option value="absent">缺勤</option>
                  <option value="pending">未到</option>
                </select>
                <input type="datetime-local" className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={studentManualForm.occurredAt} onChange={(event) => setStudentManualForm({ ...studentManualForm, occurredAt: event.target.value })} />
                <input className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" placeholder="到托照片 URL，可选" value={studentManualForm.photoUrl} onChange={(event) => setStudentManualForm({ ...studentManualForm, photoUrl: event.target.value })} />
              </div>
              <button onClick={() => void onCreateManualStudentAttendance()} className="mt-4 rounded-2xl bg-serenity-blue px-4 py-3 text-sm font-semibold text-white shadow-neumorphic">
                保存学生补录
              </button>
            </article>

            <article className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <h2 className="text-xl font-semibold">补签老师考勤</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={teacherManualForm.teacherId} onChange={(event) => setTeacherManualForm({ ...teacherManualForm, teacherId: event.target.value })}>
                  <option value="">选择老师</option>
                  {teacherOptions.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                </select>
                <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={teacherManualForm.status} onChange={(event) => setTeacherManualForm({ ...teacherManualForm, status: event.target.value as TeacherAttendanceItem["status"] })}>
                  <option value="checked_in">上班签到</option>
                  <option value="checked_out">下班签退</option>
                </select>
                <input type="datetime-local" className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={teacherManualForm.occurredAt} onChange={(event) => setTeacherManualForm({ ...teacherManualForm, occurredAt: event.target.value })} />
                <input className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" placeholder="备注" value={teacherManualForm.note} onChange={(event) => setTeacherManualForm({ ...teacherManualForm, note: event.target.value })} />
              </div>
              <button onClick={() => void onCreateManualTeacherAttendance()} className="mt-4 rounded-2xl bg-serenity-blue px-4 py-3 text-sm font-semibold text-white shadow-neumorphic">
                保存老师补签
              </button>
            </article>
          </section>
        ) : null}

        {message ? <div className="rounded-3xl bg-serenity-surface p-4 text-sm text-serenity-muted shadow-neumorphic">{message}</div> : null}
      </div>
    </main>
  );
}

function localDateTimeValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function teacherOptionsFromClasses(classes: ClassItem[]) {
  const map = new Map<string, { id: string; name: string; phone: string | null }>();
  for (const item of classes) {
    for (const row of item.teachers ?? []) {
      map.set(row.teacher.id, row.teacher);
    }
  }
  return Array.from(map.values());
}
