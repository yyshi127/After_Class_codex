"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, CheckCircle2, LogOut, RefreshCcw, ShieldAlert, XCircle } from "lucide-react";
import { AiActionLogItem, listAiActionLogs } from "../../../src/api-client";
import { AuthUser, clearSession, getStoredToken, getStoredUser, loadMe, saveSession } from "../../../src/auth-client";

const riskLabels: Record<AiActionLogItem["riskLevel"], string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
};

const riskClassNames: Record<AiActionLogItem["riskLevel"], string> = {
  low: "bg-white/70 text-serenity-muted",
  medium: "bg-serenity-blue text-white",
  high: "bg-red-100 text-red-700",
};

export default function AdminAiLogPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [logs, setLogs] = useState<AiActionLogItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

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
        return reload();
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      });
  }, [router]);

  async function reload() {
    setLoading(true);
    setMessage("");
    try {
      setLogs(await listAiActionLogs());
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
    return <main className="min-h-screen bg-serenity-bg p-8 text-serenity-muted">正在加载 AI 操作日志...</main>;
  }

  return (
    <main className="min-h-screen bg-serenity-bg p-5 text-serenity-ink">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-[32px] bg-serenity-surface p-6 shadow-neumorphic">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-serenity-muted">
                <ArrowLeft className="h-4 w-4" />
                返回工作台
              </Link>
              <h1 className="mt-3 text-3xl font-semibold">AI 操作日志</h1>
              <p className="mt-2 text-sm text-serenity-muted">展示 AI 原始输入、识别结果、风险等级、确认状态、执行结果和失败原因。</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => void reload()} className="flex h-11 items-center gap-2 rounded-2xl bg-serenity-bg px-4 text-sm font-semibold shadow-insetSoft">
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

        <section className="grid gap-4">
          {logs.map((item) => (
            <article key={item.id} className="rounded-[28px] bg-serenity-surface p-5 shadow-neumorphic">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Bot className="h-5 w-5 text-serenity-blue" />
                    <span className="font-semibold">{item.intent ?? "未识别意图"}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskClassNames[item.riskLevel]}`}>
                      {riskLabels[item.riskLevel]}
                    </span>
                    {item.riskLevel === "high" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        高风险仅记录或引导，不直接执行
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <InfoBlock label="原始输入" value={item.rawInput} />
                    <InfoBlock label="识别实体" value={formatEntities(item.entities)} />
                    <InfoBlock label="执行结果" value={item.result ?? "暂无结果"} />
                    <InfoBlock label="失败原因" value={item.error ?? "无"} />
                  </div>
                </div>

                <div className="grid min-w-72 gap-3 rounded-3xl bg-serenity-bg p-4 text-sm shadow-insetSoft">
                  <InfoRow label="校区" value={item.campus?.name ?? "未关联"} />
                  <InfoRow label="操作人" value={item.actor?.name ?? "系统"} />
                  <InfoRow label="置信度" value={item.confidence == null ? "未记录" : `${Math.round(item.confidence * 100)}%`} />
                  <InfoRow label="需要确认" value={item.requiresConfirmation ? "是" : "否"} />
                  <InfoRow label="确认人" value={item.confirmedBy?.name ?? "未确认"} />
                  <InfoRow label="确认时间" value={item.confirmedAt ? new Date(item.confirmedAt).toLocaleString("zh-CN") : "未确认"} />
                  <div className="flex items-center gap-2 text-serenity-muted">
                    {item.error ? <XCircle className="h-4 w-4 text-red-600" /> : <CheckCircle2 className="h-4 w-4 text-serenity-blue" />}
                    {new Date(item.createdAt).toLocaleString("zh-CN")}
                  </div>
                </div>
              </div>
            </article>
          ))}
          {!logs.length ? (
            <div className="rounded-[28px] bg-serenity-surface p-8 text-center text-sm text-serenity-muted shadow-neumorphic">
              {loading ? "正在加载..." : "暂无 AI 操作日志"}
            </div>
          ) : null}
          {message ? <div className="rounded-3xl bg-serenity-surface p-4 text-sm text-serenity-muted shadow-neumorphic">{message}</div> : null}
        </section>
      </div>
    </main>
  );
}

function formatEntities(value: unknown) {
  if (!value) return "未记录";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "无法展示";
  }
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-serenity-bg p-4 text-sm shadow-insetSoft">
      <div className="text-serenity-muted">{label}</div>
      <div className="mt-2 break-words leading-6">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-serenity-muted">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
