"use client";

import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { BlurText } from "@/components/reactbits/blur-text";
import { BorderGlow } from "@/components/reactbits/border-glow";
import { DecryptedText } from "@/components/reactbits/decrypted-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminAuthPanel() {
  const { loading, authenticated, message, login, logout } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await login(username, password);
    if (!ok) {
      return;
    }
    setPassword("");
  }

  async function handleLogout() {
    await logout();
  }

  if (loading) {
    return <p className="text-sm text-slate-400">正在检查登录状态...</p>;
  }

  return (
    <BorderGlow className="rounded-4xl" glowColor="rgba(103, 232, 249, 0.18)">
      <div className="space-y-4 rounded-4xl border border-white/10 bg-linear-to-b from-slate-900/40 to-slate-950/35 p-6">
        <Badge variant={authenticated ? "secondary" : "default"} className="w-fit">
          {authenticated ? "Admin Online" : "Guest"}
        </Badge>
        <p className="text-sm text-slate-300">
          <BlurText text="当前状态：" animateBy="words" />
          <span className={authenticated ? "text-emerald-300" : "text-slate-200"}>
            {authenticated ? " 已登录" : " 游客"}
          </span>
        </p>
        {authenticated ? (
          <Button type="button" variant="outline" onClick={() => void handleLogout()}>
              退出登录
            </Button>
        ) : (
          <form onSubmit={handleLogin} className="grid gap-3 md:grid-cols-3">
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="管理员账号"
            />
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="管理员密码"
            />
            <Button type="submit" className="rounded-xl">
                登录
              </Button>
          </form>
        )}
        {message ? (
          <p className="text-sm text-cyan-200/90">
            <DecryptedText text={message} speed={14} />
          </p>
        ) : null}
      </div>
    </BorderGlow>
  );
}
