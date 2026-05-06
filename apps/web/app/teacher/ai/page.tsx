"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, CheckCircle2, LogOut, Mic, RefreshCcw, Send } from "lucide-react";
import {
  AiIntentRecognitionResult,
  ClassItem,
  StudentItem,
  confirmTeacherQuickEntry,
  listClasses,
  listStudents,
  recognizeAiIntent,
} from "../../../src/api-client";
import { AuthUser, clearSession, getStoredToken, getStoredUser, loadMe, saveSession } from "../../../src/auth-client";

const actionLabels = {
  check_in: "到托签到",
  leave: "请假",
  absent: "缺勤",
} as const;

export default function TeacherAiQuickEntryPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [campusId, setCampusId] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [input, setInput] = useState("张小明已到托，拍照签到");
  const [action, setAction] = useState<keyof typeof actionLabels>("check_in");
  const [secondConfirmed, setSecondConfirmed] = useState(false);
  const [result, setResult] = useState<AiIntentRecognitionResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const campuses = useMemo(() => user?.campuses ?? [], [user]);
  const selectedCampusId = campusId || campuses[0]?.id || "";
  const selectedClassId = classId || classes[0]?.id || "";
  const selectedStudentId = studentId || students[0]?.id || "";

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
    void reloadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampusId, selectedClassId]);

  async function reloadRoster() {
    const classRows = await listClasses(selectedCampusId);
    setClasses(classRows);
    const activeClassId = selectedClassId || classRows[0]?.id || "";
    if (!classId && activeClassId) setClassId(activeClassId);
    const studentRows = activeClassId ? await listStudents({ campusId: selectedCampusId, classId: activeClassId, status: "active" }) : [];
    setStudents(studentRows);
    if (!studentId && studentRows[0]?.id) setStudentId(studentRows[0].id);
  }

  async function onRecognize() {
    setLoading(true);
    setMessage("");
    try {
      const recognized = await recognizeAiIntent({ input, campusId: selectedCampusId });
      setResult(recognized);
      setSecondConfirmed(false);
      const matchedStudent = students.find((item) => input.includes(item.name));
      if (matchedStudent) setStudentId(matchedStudent.id);
      if (input.includes("请假")) setAction("leave");
      else if (input.includes("缺勤")) setAction("absent");
      else setAction("check_in");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI 识别失败");
    } finally {
      setLoading(false);
    }
  }

  async function onConfirm() {
    if (!result || !selectedStudentId) return;
    setLoading(true);
    setMessage("");
    try {
      await confirmTeacherQuickEntry({
        logId: result.logId,
        studentId: selectedStudentId,
        action,
        secondConfirmed,
      });
      setMessage("已确认写入学生考勤，并记录 AI 操作日志。");
      setResult(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "确认写入失败");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearSession();
    router.replace("/login");
  }

  if (!user) return <main className="min-h-screen bg-serenity-bg p-8 text-serenity-muted">正在加载 AI 快捷录入...</main>;

  return (
    <main className="min-h-screen bg-serenity-bg p-5 text-serenity-ink">
      <div className="mx-auto grid max-w-6xl gap-5">
        <header className="rounded-[32px] bg-serenity-surface p-6 shadow-neumorphic">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-serenity-muted">
                <ArrowLeft className="h-4 w-4" />
                返回工作台
              </Link>
              <h1 className="mt-3 text-3xl font-semibold">AI 快捷录入</h1>
              <p className="mt-2 text-sm text-serenity-muted">老师输入自然语言，AI 识别学生考勤动作，确认后才写入业务数据。</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={selectedCampusId} onChange={(event) => { setCampusId(event.target.value); setClassId(""); setStudentId(""); }}>
                {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
              </select>
              <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft outline-none" value={selectedClassId} onChange={(event) => { setClassId(event.target.value); setStudentId(""); }}>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button onClick={logout} className="flex h-11 items-center gap-2 rounded-2xl bg-serenity-bg px-4 text-sm shadow-insetSoft">
                <LogOut className="h-4 w-4" />
                退出
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-serenity-blue" />
              <h2 className="text-xl font-semibold">自然语言录入</h2>
            </div>
            <textarea className="mt-5 min-h-36 w-full rounded-3xl bg-serenity-bg p-4 shadow-insetSoft outline-none" value={input} onChange={(event) => setInput(event.target.value)} />
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="flex h-11 items-center gap-2 rounded-2xl bg-serenity-bg px-4 text-sm font-semibold text-serenity-muted shadow-insetSoft">
                <Mic className="h-4 w-4" />
                语音转文字入口
              </button>
              <button onClick={() => void onRecognize()} disabled={!input.trim() || loading} className="flex h-11 items-center gap-2 rounded-2xl bg-serenity-blue px-4 text-sm font-semibold text-white shadow-neumorphic disabled:bg-serenity-muted">
                <Send className="h-4 w-4" />
                识别
              </button>
            </div>
          </div>

          <aside className="grid content-start gap-5">
            <section className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">确认卡片</h2>
                <button onClick={() => void reloadRoster()} className="rounded-2xl bg-serenity-bg p-3 shadow-insetSoft">
                  <RefreshCcw className="h-4 w-4" />
                </button>
              </div>
              {result ? (
                <div className="mt-5 grid gap-3 text-sm">
                  <Info label="识别意图" value={result.intent} />
                  <Info label="风险等级" value={result.riskLevel} />
                  <Info label="置信度" value={`${Math.round(result.confidence * 100)}%`} />
                  <label className="grid gap-2 text-serenity-muted">
                    学生
                    <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-serenity-ink shadow-insetSoft outline-none" value={selectedStudentId} onChange={(event) => setStudentId(event.target.value)}>
                      {students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-serenity-muted">
                    动作
                    <select className="h-11 rounded-2xl bg-serenity-bg px-4 text-serenity-ink shadow-insetSoft outline-none" value={action} onChange={(event) => setAction(event.target.value as keyof typeof actionLabels)}>
                      {Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  {result.riskLevel === "medium" ? (
                    <label className="flex items-center gap-2 rounded-2xl bg-serenity-bg p-3 shadow-insetSoft">
                      <input type="checkbox" checked={secondConfirmed} onChange={(event) => setSecondConfirmed(event.target.checked)} />
                      中风险二次确认
                    </label>
                  ) : null}
                  <button onClick={() => void onConfirm()} disabled={loading || result.riskLevel === "high"} className="mt-2 flex h-11 items-center justify-center gap-2 rounded-2xl bg-serenity-blue px-4 text-sm font-semibold text-white shadow-neumorphic disabled:bg-serenity-muted">
                    <CheckCircle2 className="h-4 w-4" />
                    确认写入
                  </button>
                </div>
              ) : (
                <div className="mt-5 rounded-3xl bg-serenity-bg p-6 text-center text-sm text-serenity-muted shadow-insetSoft">等待 AI 识别结果</div>
              )}
            </section>
            {message ? <div className="rounded-3xl bg-serenity-surface p-4 text-sm text-serenity-muted shadow-neumorphic">{message}</div> : null}
          </aside>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-serenity-bg p-3 shadow-insetSoft">
      <div className="text-serenity-muted">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
