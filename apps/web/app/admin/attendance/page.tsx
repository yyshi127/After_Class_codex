"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarCheck2, Camera, LogOut, RefreshCcw, UserCheck } from "lucide-react";
import {
  ClassItem,
  StudentAttendanceItem,
  StudentItem,
  TeacherAttendanceItem,
  listClasses,
  listStudentAttendance,
  listStudents,
  listTeacherAttendance,
} from "../../../src/api-client";
import { AuthUser, clearSession, getStoredToken, getStoredUser, loadMe, saveSession } from "../../../src/auth-client";

const attendanceLabels: Record<string, string> = {
  pending: "未到",
  checked_in: "已到校",
  checked_out: "已离校",
  leave: "请假",
  absent: "缺勤",
};

export default function AdminAttendancePage() {
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
      const [studentRows, studentAttendanceRows, teacherAttendanceRows] = await Promise.all([
        activeClassId ? listStudents({ campusId: selectedCampusId, classId: activeClassId, status: "active" }) : [],
        listStudentAttendance({ campusId: selectedCampusId }),
        listTeacherAttendance(selectedCampusId),
      ]);
      setStudents(studentRows);
      setStudentAttendance(studentAttendanceRows);
      setTeacherAttendance(teacherAttendanceRows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  function latestStudentAttendance(studentId: string) {
    return studentAttendance.find((item) => item.studentId === studentId);
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
              <span className="text-sm text-serenity-muted">{loading ? "加载中" : `${students.length} 人`}</span>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[780px] border-separate border-spacing-y-2 text-left text-sm">
                <thead className="text-serenity-muted">
                  <tr><th>学生</th><th>班级</th><th>状态</th><th>时间</th><th>到托照片</th></tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const attendance = latestStudentAttendance(student.id);
                    return (
                      <tr key={student.id} className="bg-serenity-bg shadow-insetSoft">
                        <td className="rounded-l-2xl px-4 py-3 font-semibold">{student.name}</td>
                        <td className="px-4 py-3">{student.class?.name ?? "未分班"}</td>
                        <td className="px-4 py-3">{attendanceLabels[attendance?.status ?? "pending"]}</td>
                        <td className="px-4 py-3">{attendance ? new Date(attendance.occurredAt).toLocaleString("zh-CN") : "-"}</td>
                        <td className="rounded-r-2xl px-4 py-3">
                          {attendance?.photoUrl ? <span className="inline-flex items-center gap-2"><Camera className="h-4 w-4" />已上传</span> : "暂无"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!students.length ? <div className="rounded-3xl bg-serenity-bg p-8 text-center text-sm text-serenity-muted shadow-insetSoft">当前班级暂无学生</div> : null}
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

        {message ? <div className="rounded-3xl bg-serenity-surface p-4 text-sm text-serenity-muted shadow-neumorphic">{message}</div> : null}
      </div>
    </main>
  );
}
