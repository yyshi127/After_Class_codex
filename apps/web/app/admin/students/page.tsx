"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, Plus, RefreshCcw, School, UserRoundPlus, Users } from "lucide-react";
import {
  ClassItem,
  StudentItem,
  configureStudentService,
  createClass,
  createStudent,
  getStudentIdCardDetail,
  listClasses,
  listStudents,
} from "../../../src/api-client";
import { AuthUser, clearSession, getStoredToken, getStoredUser, loadMe, saveSession } from "../../../src/auth-client";

const statusLabels: Record<string, string> = {
  active: "在读",
  paused: "停读",
};

const billingCycleLabels: Record<string, string> = {
  monthly: "月缴",
  semester: "学期缴",
};

const serviceTypeCards = [
  {
    code: "noon-care",
    name: "中午托",
    description: "包含接送、午餐和午休。",
    tags: ["接送", "午餐", "午休"],
    mutedTags: ["作业辅导"],
  },
  {
    code: "afternoon-care",
    name: "下午托",
    description: "包含接放学和就餐。",
    tags: ["接放学", "就餐"],
    mutedTags: ["午休", "作业辅导"],
  },
  {
    code: "homework-only",
    name: "晚辅导",
    description: "不接、不吃，仅辅导作业。",
    tags: ["作业辅导"],
    mutedTags: ["接送", "就餐", "午休"],
  },
  {
    code: "full-evening-care",
    name: "晚全托",
    description: "下午托加晚辅导，包含接放学、就餐和作业辅导。",
    tags: ["接放学", "就餐", "作业辅导"],
    mutedTags: ["午休"],
  },
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminStudentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [campusId, setCampusId] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [idCardDetails, setIdCardDetails] = useState<Record<string, string | null>>({});
  const [idCardLoadingStudentId, setIdCardLoadingStudentId] = useState("");
  const [studentForm, setStudentForm] = useState({
    name: "",
    gender: "男",
    grade: "三年级",
    schoolName: "",
    idCardNo: "",
    classId: "",
  });
  const [serviceForm, setServiceForm] = useState({
    studentId: "",
    serviceTypeCode: "full-evening-care",
    billingCycle: "monthly" as "monthly" | "semester",
    validFrom: todayIsoDate(),
    validTo: todayIsoDate(),
  });
  const [className, setClassName] = useState("");

  const campuses = useMemo(() => user?.campuses ?? [], [user]);
  const selectedCampusId = campusId || campuses[0]?.id || "";
  const canRevealIdCard = user?.role === "admin";

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
  }, [selectedCampusId, classId, status]);

  async function reload() {
    setLoading(true);
    setMessage("");
    try {
      const [studentRows, classRows] = await Promise.all([
        listStudents({ campusId: selectedCampusId, classId: classId || undefined, status: status || undefined }),
        listClasses(selectedCampusId),
      ]);
      setStudents(studentRows);
      setClasses(classRows);
      setServiceForm((prev) => ({ ...prev, studentId: prev.studentId || studentRows[0]?.id || "" }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCampusId || !studentForm.name) return;

    await createStudent({
      campusId: selectedCampusId,
      classId: studentForm.classId || undefined,
      name: studentForm.name,
      gender: studentForm.gender,
      grade: studentForm.grade,
      schoolName: studentForm.schoolName,
      idCardNo: studentForm.idCardNo,
    });
    setStudentForm({ name: "", gender: "男", grade: "三年级", schoolName: "", idCardNo: "", classId: "" });
    setMessage("学生已新增");
    await reload();
  }

  async function onCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCampusId || !className) return;

    await createClass({ campusId: selectedCampusId, name: className });
    setClassName("");
    setMessage("班级已新增");
    await reload();
  }

  async function onConfigureService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!serviceForm.studentId) return;

    await configureStudentService(serviceForm.studentId, {
      serviceTypeCode: serviceForm.serviceTypeCode,
      billingCycle: serviceForm.billingCycle,
      validFrom: serviceForm.validFrom,
      validTo: serviceForm.validTo,
    });
    setMessage("托管类型与服务有效期已保存");
    await reload();
  }

  async function onRevealIdCard(student: StudentItem) {
    if (idCardDetails[student.id] || idCardLoadingStudentId) return;
    setIdCardLoadingStudentId(student.id);
    setMessage("");
    try {
      const detail = await getStudentIdCardDetail(student.id);
      setIdCardDetails((prev) => ({ ...prev, [student.id]: detail.idCardNoFull }));
      setMessage(`已记录完整身份证号查看审计：${student.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "查看完整身份证号失败");
    } finally {
      setIdCardLoadingStudentId("");
    }
  }

  return (
    <main className="min-h-screen bg-serenity-bg p-5 text-serenity-ink">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="flex flex-col gap-4 rounded-[32px] bg-serenity-surface p-6 shadow-neumorphic md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-serenity-muted">
              <ArrowLeft className="h-4 w-4" />
              返回工作台
            </Link>
            <h1 className="mt-3 text-3xl font-semibold">学生与班级管理</h1>
            <p className="mt-2 text-sm text-serenity-muted">维护学生档案、班级、托管类型、服务有效期和身份证号脱敏展示。</p>
          </div>

          <button
            onClick={() => void reload()}
            className="flex h-11 items-center gap-2 rounded-2xl bg-serenity-bg px-4 text-sm font-medium shadow-insetSoft"
          >
            <RefreshCcw className="h-4 w-4" />
            刷新
          </button>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-5">
            <div className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm font-medium">
                  校区
                  <select
                    value={selectedCampusId}
                    onChange={(event) => {
                      setCampusId(event.target.value);
                      setClassId("");
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
                    onChange={(event) => setClassId(event.target.value)}
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
                  状态
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="mt-2 h-11 w-full rounded-2xl bg-serenity-bg px-4 shadow-insetSoft outline-none"
                  >
                    <option value="">全部状态</option>
                    <option value="active">在读</option>
                    <option value="paused">停读</option>
                  </select>
                </label>
              </div>
            </div>

            <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center gap-3">
                <School className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">托管类型服务边界</h2>
              </div>
              <p className="mt-2 text-sm text-serenity-muted">托管类型会影响考勤口径、收费周期、老师工作台提示和家长端服务说明。</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {serviceTypeCards.map((item) => (
                  <article key={item.code} className="rounded-3xl bg-serenity-bg p-4 shadow-insetSoft">
                    <div className="font-semibold">{item.name}</div>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-serenity-muted">{item.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-serenity-blue px-3 py-1 text-xs font-semibold text-white">
                          {tag}
                        </span>
                      ))}
                      {item.mutedTags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white/70 px-3 py-1 text-xs text-serenity-muted">
                          不含{tag}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-serenity-blue" />
                  <h2 className="text-xl font-semibold">学生档案</h2>
                </div>
                <span className="text-sm text-serenity-muted">{loading ? "加载中" : `${students.length} 人`}</span>
              </div>

              <div className="mt-5 overflow-x-auto rounded-3xl bg-serenity-bg shadow-insetSoft">
                <div className="min-w-[980px]">
                  <div className="grid grid-cols-[1fr_0.7fr_0.9fr_1fr_1fr_1.2fr_0.7fr] gap-3 border-b border-white/70 px-5 py-3 text-sm font-semibold text-serenity-muted">
                    <span>姓名</span>
                    <span>年级</span>
                    <span>班级</span>
                    <span>托管服务</span>
                    <span>服务有效期</span>
                    <span>身份证号</span>
                    <span>状态</span>
                  </div>
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="grid grid-cols-[1fr_0.7fr_0.9fr_1fr_1fr_1.2fr_0.7fr] gap-3 px-5 py-4 text-sm"
                    >
                      <span className="font-medium">{student.name}</span>
                      <span>{student.grade || "-"}</span>
                      <span>{student.class?.name || "未分班"}</span>
                      <span>{student.currentService?.serviceType.name || "未配置"}</span>
                      <span>
                        {student.currentService ? (
                          <>
                            {formatDate(student.currentService.validFrom)} 至 {formatDate(student.currentService.validTo)}
                            <span className="ml-2 text-xs text-serenity-muted">
                              {billingCycleLabels[student.currentService.billingCycle]}
                            </span>
                          </>
                        ) : (
                          "-"
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <span>{student.idCardNoFull || idCardDetails[student.id] || student.idCardNoMasked || "未录入"}</span>
                        {canRevealIdCard && !idCardDetails[student.id] ? (
                          <button
                            type="button"
                            onClick={() => void onRevealIdCard(student)}
                            disabled={idCardLoadingStudentId === student.id}
                            className="rounded-full bg-white/70 px-2 py-1 text-[11px] text-serenity-muted disabled:opacity-60"
                          >
                            {idCardLoadingStudentId === student.id ? "加载中" : "查看完整"}
                          </button>
                        ) : null}
                      </span>
                      <span>{statusLabels[student.status] || student.status}</span>
                    </div>
                  ))}
                  {!students.length ? <div className="px-5 py-8 text-center text-sm text-serenity-muted">暂无学生</div> : null}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">班级列表</h2>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {classes.map((item) => (
                  <article key={item.id} className="rounded-3xl bg-serenity-bg p-4 shadow-insetSoft">
                    <div className="font-semibold">{item.name}</div>
                    <div className="mt-2 text-sm text-serenity-muted">{item.campus?.name}</div>
                    <div className="mt-3 text-sm">学生 {item._count?.students ?? 0} 人</div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="grid gap-5">
            <form onSubmit={onCreateStudent} className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center gap-3">
                <UserRoundPlus className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">新增学生</h2>
              </div>
              <div className="mt-5 grid gap-3">
                <input className="h-11 rounded-2xl bg-serenity-bg px-4 shadow-insetSoft outline-none" placeholder="学生姓名" value={studentForm.name} onChange={(event) => setStudentForm({ ...studentForm, name: event.target.value })} />
                <select className="h-11 rounded-2xl bg-serenity-bg px-4 shadow-insetSoft outline-none" value={studentForm.classId} onChange={(event) => setStudentForm({ ...studentForm, classId: event.target.value })}>
                  <option value="">暂不分班</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <input className="h-11 rounded-2xl bg-serenity-bg px-4 shadow-insetSoft outline-none" placeholder="年级" value={studentForm.grade} onChange={(event) => setStudentForm({ ...studentForm, grade: event.target.value })} />
                <input className="h-11 rounded-2xl bg-serenity-bg px-4 shadow-insetSoft outline-none" placeholder="学校" value={studentForm.schoolName} onChange={(event) => setStudentForm({ ...studentForm, schoolName: event.target.value })} />
                <input className="h-11 rounded-2xl bg-serenity-bg px-4 shadow-insetSoft outline-none" placeholder="身份证号" value={studentForm.idCardNo} onChange={(event) => setStudentForm({ ...studentForm, idCardNo: event.target.value })} />
                <button className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-serenity-blue px-4 text-sm font-semibold text-white shadow-neumorphic">
                  <Plus className="h-4 w-4" />
                  新增学生
                </button>
              </div>
            </form>

            {user?.role === "admin" ? (
              <form onSubmit={onConfigureService} className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-serenity-blue" />
                  <h2 className="text-xl font-semibold">配置服务</h2>
                </div>
                <div className="mt-5 grid gap-3">
                  <select className="h-11 rounded-2xl bg-serenity-bg px-4 shadow-insetSoft outline-none" value={serviceForm.studentId} onChange={(event) => setServiceForm({ ...serviceForm, studentId: event.target.value })}>
                    <option value="">选择学生</option>
                    {students.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <select className="h-11 rounded-2xl bg-serenity-bg px-4 shadow-insetSoft outline-none" value={serviceForm.serviceTypeCode} onChange={(event) => setServiceForm({ ...serviceForm, serviceTypeCode: event.target.value })}>
                    {serviceTypeCards.map((item) => (
                      <option key={item.code} value={item.code}>{item.name}</option>
                    ))}
                  </select>
                  <select className="h-11 rounded-2xl bg-serenity-bg px-4 shadow-insetSoft outline-none" value={serviceForm.billingCycle} onChange={(event) => setServiceForm({ ...serviceForm, billingCycle: event.target.value as "monthly" | "semester" })}>
                    <option value="monthly">月缴</option>
                    <option value="semester">学期缴</option>
                  </select>
                  <label className="text-xs font-semibold text-serenity-muted">
                    服务开始
                    <input type="date" className="mt-2 h-11 w-full rounded-2xl bg-serenity-bg px-4 text-sm text-serenity-ink shadow-insetSoft outline-none" value={serviceForm.validFrom} onChange={(event) => setServiceForm({ ...serviceForm, validFrom: event.target.value })} />
                  </label>
                  <label className="text-xs font-semibold text-serenity-muted">
                    服务到期
                    <input type="date" className="mt-2 h-11 w-full rounded-2xl bg-serenity-bg px-4 text-sm text-serenity-ink shadow-insetSoft outline-none" value={serviceForm.validTo} onChange={(event) => setServiceForm({ ...serviceForm, validTo: event.target.value })} />
                  </label>
                  <button className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-serenity-blue px-4 text-sm font-semibold text-white shadow-neumorphic">
                    <Plus className="h-4 w-4" />
                    保存托管服务
                  </button>
                </div>
              </form>
            ) : null}

            <form onSubmit={onCreateClass} className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center gap-3">
                <School className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">新增班级</h2>
              </div>
              <div className="mt-5 grid gap-3">
                <input className="h-11 rounded-2xl bg-serenity-bg px-4 shadow-insetSoft outline-none" placeholder="班级名称" value={className} onChange={(event) => setClassName(event.target.value)} />
                <button className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-serenity-blue px-4 text-sm font-semibold text-white shadow-neumorphic">
                  <Plus className="h-4 w-4" />
                  新增班级
                </button>
              </div>
            </form>

            {message ? <div className="rounded-3xl bg-serenity-surface p-4 text-sm text-serenity-muted shadow-neumorphic">{message}</div> : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
