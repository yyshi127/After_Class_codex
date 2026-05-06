"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calculator, CreditCard, Download, LogOut, RefreshCcw } from "lucide-react";
import {
  BillingRecordItem,
  ClassItem,
  ClassSettlementItem,
  StudentItem,
  createBillingRecord,
  generateClassSettlement,
  listBillingRecords,
  listClassSettlements,
  listClasses,
  listStudents,
  sendOverdueServiceReminder,
} from "../../../src/api-client";
import { AuthUser, clearSession, getStoredToken, getStoredUser, loadMe, saveSession } from "../../../src/auth-client";

function yuan(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

export default function AdminFinancePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [billingRows, setBillingRows] = useState<BillingRecordItem[]>([]);
  const [settlements, setSettlements] = useState<ClassSettlementItem[]>([]);
  const [campusId, setCampusId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "semester">("monthly");
  const [amountDue, setAmountDue] = useState("1200");
  const [amountPaid, setAmountPaid] = useState("1200");
  const [periodStart, setPeriodStart] = useState("2026-05-01");
  const [periodEnd, setPeriodEnd] = useState("2026-05-31");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const campuses = useMemo(() => user?.campuses ?? [], [user]);
  const selectedCampusId = campusId || campuses[0]?.id || "";
  const selectedStudentId = studentId || students[0]?.id || "";
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
        if (freshUser.role !== "admin" && freshUser.role !== "teacher") {
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
  }, [selectedCampusId, selectedStudentId, selectedClassId]);

  async function reload() {
    setLoading(true);
    setMessage("");
    try {
      const [studentRows, classRows] = await Promise.all([
        listStudents({ campusId: selectedCampusId, status: "active" }),
        listClasses(selectedCampusId),
      ]);
      setStudents(studentRows);
      setClasses(classRows);
      const activeStudentId = selectedStudentId || studentRows[0]?.id || "";
      const activeClassId = selectedClassId || classRows[0]?.id || "";
      if (!studentId && activeStudentId) setStudentId(activeStudentId);
      if (!classId && activeClassId) setClassId(activeClassId);
      const [billingList, settlementList] = await Promise.all([
        listBillingRecords({ campusId: selectedCampusId, studentId: activeStudentId || undefined }),
        user?.role === "admin"
          ? listClassSettlements({ campusId: selectedCampusId, classId: activeClassId || undefined, periodStart, periodEnd })
          : Promise.resolve([]),
      ]);
      setBillingRows(billingList);
      setSettlements(settlementList);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateBilling() {
    if (!selectedStudentId) return;
    await createBillingRecord({
      campusId: selectedCampusId,
      studentId: selectedStudentId,
      billingCycle,
      periodStart: `${periodStart}T00:00:00.000Z`,
      periodEnd: `${periodEnd}T23:59:59.000Z`,
      amountDueCents: Math.round(Number(amountDue) * 100),
      amountPaidCents: Math.round(Number(amountPaid) * 100),
      paidAt: new Date().toISOString(),
      note: billingCycle === "monthly" ? "月缴记录" : "学期缴记录",
    });
    setMessage("缴费记录已保存");
    await reload();
  }

  async function onSendOverdueReminder() {
    if (!selectedStudentId) return;
    await sendOverdueServiceReminder(selectedStudentId);
    setMessage("逾期服务提醒已发送给绑定家长");
    await reload();
  }

  async function onGenerateSettlement() {
    if (!selectedClassId || user?.role !== "admin") return;
    await generateClassSettlement({
      campusId: selectedCampusId,
      classId: selectedClassId,
      periodStart: `${periodStart}T00:00:00.000Z`,
      periodEnd: `${periodEnd}T23:59:59.000Z`,
    });
    setMessage("班级核算已生成");
    await reload();
  }

  function onExportSettlements() {
    if (!settlements.length) {
      setMessage("暂无可导出的核算记录");
      return;
    }

    const header = ["班级", "老师", "核算开始", "核算结束", "学生出勤次数", "收入", "老师课费", "班级毛利", "状态"];
    const rows = settlements.map((item) => [
      item.class?.name ?? item.classId,
      item.teacher?.name ?? "",
      new Date(item.periodStart).toLocaleDateString("zh-CN"),
      new Date(item.periodEnd).toLocaleDateString("zh-CN"),
      String(item.studentAttendCount),
      (item.incomeCents / 100).toFixed(2),
      (item.teacherFeeCents / 100).toFixed(2),
      (item.grossProfitCents / 100).toFixed(2),
      item.status === "draft" ? "草稿" : "已确认",
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `班级核算-${periodStart}-${periodEnd}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("班级核算 CSV 已导出");
  }

  function logout() {
    clearSession();
    router.replace("/login");
  }

  if (!user) {
    return <main className="min-h-screen bg-serenity-bg p-8 text-serenity-muted">正在加载财务核算...</main>;
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
              <h1 className="mt-3 text-3xl font-semibold">收费与班级核算</h1>
              <p className="mt-2 text-sm text-serenity-muted">校长和授权老师可查看缴费、余额和到期；班级毛利仅限管理视角。</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={selectedCampusId} onChange={(event) => { setCampusId(event.target.value); setStudentId(""); setClassId(""); }}>
                {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
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

        <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <aside className="grid content-start gap-5">
            <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">录入缴费</h2>
              </div>
              <div className="mt-5 grid gap-4">
                <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={selectedStudentId} onChange={(event) => setStudentId(event.target.value)}>
                  {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
                </select>
                <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={billingCycle} onChange={(event) => setBillingCycle(event.target.value as "monthly" | "semester")}>
                  <option value="monthly">月缴</option>
                  <option value="semester">学期缴</option>
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} type="date" />
                  <input className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} type="date" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={amountDue} onChange={(event) => setAmountDue(event.target.value)} placeholder="应收金额" />
                  <input className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} placeholder="实收金额" />
                </div>
                <button onClick={() => void onCreateBilling()} className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-serenity-blue px-4 text-sm font-semibold text-white shadow-neumorphic">
                  保存缴费记录
                </button>
                {user.role === "admin" ? (
                  <button onClick={() => void onSendOverdueReminder()} className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-serenity-bg px-4 text-sm font-semibold shadow-insetSoft">
                    手动发送逾期提醒
                  </button>
                ) : null}
              </div>
            </section>

            <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-serenity-blue" />
                <h2 className="text-xl font-semibold">生成班级核算</h2>
              </div>
              <div className="mt-5 grid gap-4">
                <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={selectedClassId} onChange={(event) => setClassId(event.target.value)}>
                  {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <button disabled={user.role !== "admin"} onClick={() => void onGenerateSettlement()} className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-serenity-bg px-4 text-sm font-semibold shadow-insetSoft disabled:text-serenity-muted">
                  生成核算
                </button>
                {user.role !== "admin" ? <div className="text-sm text-serenity-muted">老师端可查看学生缴费和服务到期，不展示班级毛利。</div> : null}
              </div>
            </section>
            {message ? <div className="rounded-3xl bg-serenity-surface p-4 text-sm text-serenity-muted shadow-neumorphic">{message}</div> : null}
          </aside>

          <section className="grid gap-5">
            <article className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <h2 className="text-xl font-semibold">缴费记录</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
                  <thead className="text-serenity-muted">
                    <tr><th>学生</th><th>周期</th><th>服务期</th><th>应收</th><th>实收</th><th>余额/欠费</th><th>状态</th></tr>
                  </thead>
                  <tbody>
                    {billingRows.map((row) => (
                      <tr key={row.id} className="bg-serenity-bg shadow-insetSoft">
                        <td className="rounded-l-2xl px-4 py-3 font-semibold">{row.student?.name ?? row.studentId}</td>
                        <td className="px-4 py-3">{row.billingCycle === "monthly" ? "月缴" : "学期缴"}</td>
                        <td className="px-4 py-3">{new Date(row.periodStart).toLocaleDateString("zh-CN")} - {new Date(row.periodEnd).toLocaleDateString("zh-CN")}</td>
                        <td className="px-4 py-3">{yuan(row.amountDueCents)}</td>
                        <td className="px-4 py-3">{yuan(row.amountPaidCents)}</td>
                        <td className="px-4 py-3">{yuan(row.balanceCents)}</td>
                        <td className="rounded-r-2xl px-4 py-3">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!billingRows.length ? <div className="rounded-3xl bg-serenity-bg p-8 text-center text-sm text-serenity-muted shadow-insetSoft">暂无缴费记录</div> : null}
              </div>
            </article>

            <article className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-semibold">班级核算</h2>
                {user.role === "admin" ? (
                  <button
                    onClick={onExportSettlements}
                    className="flex h-10 w-fit items-center gap-2 rounded-2xl bg-serenity-bg px-4 text-sm font-semibold shadow-insetSoft"
                  >
                    <Download className="h-4 w-4" />
                    导出 CSV
                  </button>
                ) : null}
              </div>
              {user.role === "admin" ? (
                <div className="mt-5 grid gap-3">
                  {settlements.map((item) => (
                    <div key={item.id} className="grid gap-3 rounded-3xl bg-serenity-bg p-4 shadow-insetSoft md:grid-cols-5">
                      <div><div className="text-serenity-muted">班级</div><div className="font-semibold">{item.class?.name ?? item.classId}</div></div>
                      <div><div className="text-serenity-muted">出勤</div><div className="font-semibold">{item.studentAttendCount} 次</div></div>
                      <div><div className="text-serenity-muted">收入</div><div className="font-semibold">{yuan(item.incomeCents)}</div></div>
                      <div><div className="text-serenity-muted">老师课费</div><div className="font-semibold">{yuan(item.teacherFeeCents)}</div></div>
                      <div><div className="text-serenity-muted">毛利</div><div className="font-semibold">{yuan(item.grossProfitCents)}</div></div>
                    </div>
                  ))}
                  {!settlements.length ? <div className="rounded-3xl bg-serenity-bg p-8 text-center text-sm text-serenity-muted shadow-insetSoft">{loading ? "加载中" : "暂无核算记录"}</div> : null}
                </div>
              ) : (
                <div className="mt-5 rounded-3xl bg-serenity-bg p-8 text-center text-sm text-serenity-muted shadow-insetSoft">老师端不展示班级毛利和机构经营数据</div>
              )}
            </article>
          </section>
        </section>
      </div>
    </main>
  );
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
