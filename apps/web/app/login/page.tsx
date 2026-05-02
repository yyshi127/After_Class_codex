"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Phone, School } from "lucide-react";
import { login, saveSession } from "../../src/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("13800000000");
  const [password, setPassword] = useState("Admin123456");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await login(phone, password);
      saveSession(response);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-serenity-bg px-5 py-10 text-serenity-ink">
      <section className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[34px] bg-serenity-surface p-8 shadow-neumorphic">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-serenity-bg shadow-insetSoft">
            <School className="h-7 w-7 text-serenity-blue" />
          </div>
          <h1 className="mt-8 text-4xl font-semibold tracking-normal">智能晚辅托管系统</h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-serenity-muted">
            先完成账号登录、角色识别和多校区权限底座。后续管理端、老师端、家长端和学生端都会基于这一层展开。
          </p>
          <div className="mt-8 grid gap-3 text-sm text-serenity-muted">
            <div className="rounded-2xl bg-serenity-bg px-4 py-3 shadow-insetSoft">默认管理员：13800000000</div>
            <div className="rounded-2xl bg-serenity-bg px-4 py-3 shadow-insetSoft">默认密码：Admin123456</div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="rounded-[34px] bg-serenity-surface p-8 shadow-neumorphic">
          <h2 className="text-2xl font-semibold">登录工作台</h2>
          <p className="mt-2 text-sm text-serenity-muted">使用 seed 账号进入角色工作台。</p>

          <label className="mt-8 block text-sm font-medium">
            手机号
            <span className="mt-2 flex items-center gap-3 rounded-2xl bg-serenity-bg px-4 py-3 shadow-insetSoft">
              <Phone className="h-5 w-5 text-serenity-muted" />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full bg-transparent text-base outline-none"
                autoComplete="username"
              />
            </span>
          </label>

          <label className="mt-5 block text-sm font-medium">
            密码
            <span className="mt-2 flex items-center gap-3 rounded-2xl bg-serenity-bg px-4 py-3 shadow-insetSoft">
              <LockKeyhole className="h-5 w-5 text-serenity-muted" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="w-full bg-transparent text-base outline-none"
                autoComplete="current-password"
              />
            </span>
          </label>

          {error ? <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-8 h-12 w-full rounded-2xl bg-serenity-blue text-base font-semibold text-white shadow-neumorphic transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "登录中..." : "登录"}
          </button>
        </form>
      </section>
    </main>
  );
}
