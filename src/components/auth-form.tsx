"use client";

import { useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const authInputClass =
  "border-cyan-200/40 bg-slate-100 text-slate-900 placeholder:text-slate-400 focus-visible:ring-cyan-400/60";

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const { signIn } = useAuth();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signIn(account, password);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-1.5 text-sm text-slate-300">
        邮箱 / 手机号
        <Input
          type="text"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="邮箱或 11 位手机号"
          required
          autoComplete="username"
          className={authInputClass}
        />
      </label>
      <label className="grid gap-1.5 text-sm text-slate-300">
        密码
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="已有账号直接登录；新账号至少 6 位"
          required
          minLength={1}
          autoComplete="current-password"
          className={authInputClass}
        />
      </label>

      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full rounded-xl">
        {pending ? "请稍候…" : "登录"}
      </Button>

      <p className="text-center text-xs text-slate-500">
        未注册账号将自动创建
      </p>
    </form>
  );
}
