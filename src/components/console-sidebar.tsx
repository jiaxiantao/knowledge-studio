"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, UserRound } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { SiteHealthBadge } from "@/components/site-health-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const navItems = [
  { href: "/knowledge", label: "知识管理" },
  { href: "/retrieval", label: "知识检索" },
  { href: "/assistant", label: "知识问答" },
  { href: "/developer/keys", label: "开放平台" },
];

const AVATAR_PALETTES = [
  "from-cyan-400/90 to-sky-600/90",
  "from-teal-400/90 to-cyan-700/90",
  "from-sky-300/90 to-indigo-500/90",
  "from-emerald-400/90 to-teal-700/90",
  "from-blue-400/90 to-cyan-600/90",
] as const;

function hashAccount(account: string) {
  let hash = 0;
  for (let i = 0; i < account.length; i += 1) {
    hash = (hash * 31 + account.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function avatarInitial(account: string) {
  if (account.includes("@")) {
    return account[0]?.toUpperCase() ?? "U";
  }
  return account.slice(-2) || "U";
}

function UserAvatar({ account }: { account: string }) {
  const palette = AVATAR_PALETTES[hashAccount(account) % AVATAR_PALETTES.length];
  const initial = avatarInitial(account);

  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${palette} text-xs font-semibold tracking-wide text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]`}
      aria-hidden
    >
      {initial}
    </div>
  );
}

function GuestAvatar() {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-400"
      aria-hidden
    >
      <UserRound className="h-4 w-4" />
    </div>
  );
}

export function ConsoleSidebar({
  activePath,
}: {
  activePath: string;
}) {
  const { user, loading, logout, openAuthDialog } = useAuth();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function confirmLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setLogoutConfirmOpen(false);
    }
  }

  return (
    <aside className="flex h-full w-[14rem] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-slate-950/50 px-4 py-6">
      <Link
        href="/knowledge"
        className="flex min-w-0 items-center gap-2.5 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 transition hover:text-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/knowledge-studio-icon.svg"
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 rounded-lg"
        />
        <span className="leading-snug">
          Knowledge
          <br />
          Studio
        </span>
      </Link>
      <nav className="mt-5 grid min-w-0 gap-1">
        {navItems.map((item) => {
          const active =
            activePath === item.href || activePath.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-cyan-300/15 text-cyan-100"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto grid min-w-0 gap-4 px-2 pt-6">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-3">
          {loading ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/10" />
              <div className="h-3 min-w-0 flex-1 animate-pulse rounded bg-white/10" />
            </div>
          ) : user ? (
            <div className="flex min-w-0 items-start gap-2.5">
              <UserAvatar account={user.account} />
              <div className="min-w-0 flex-1 overflow-hidden">
                <p
                  className="truncate text-sm font-medium text-white"
                  title={user.account}
                >
                  {user.account}
                </p>
                <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(true)}
                  className="mt-1.5 inline-flex max-w-full items-center gap-1 text-xs text-slate-400 transition hover:text-cyan-200"
                >
                  <LogOut className="h-3 w-3 shrink-0" />
                  <span className="truncate">退出登录</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 items-start gap-2.5">
              <GuestAvatar />
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-white">游客</p>
                <button
                  type="button"
                  onClick={() => openAuthDialog()}
                  className="mt-1.5 text-xs text-cyan-200 transition hover:underline"
                >
                  登录
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="min-w-0 overflow-hidden">
          <SiteHealthBadge />
        </div>
      </div>

      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent
          onClose={() => setLogoutConfirmOpen(false)}
          className="max-w-sm"
        >
          <DialogHeader>
            <DialogTitle>退出登录</DialogTitle>
            <DialogDescription>
              确定退出当前账号
              {user?.account ? `「${user.account}」` : ""}
              吗？退出后需重新登录才能使用数据功能。
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLogoutConfirmOpen(false)}
              disabled={loggingOut}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={() => {
                void confirmLogout();
              }}
              disabled={loggingOut}
            >
              {loggingOut ? "退出中…" : "确认退出"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
