"use client";

import { MessageSquarePlus, Trash2 } from "lucide-react";

import type { ChatSession } from "@/lib/chat-types";
import { getActiveBranch } from "@/lib/chat-sessions";

type ChatSessionSidebarProps = {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelect: (sessionId: string) => void;
  onCreate: () => void;
  onDelete: (sessionId: string) => void;
};

export function ChatSessionSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onCreate,
  onDelete,
}: ChatSessionSidebarProps) {
  return (
    <aside className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
          Sessions
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          新建
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        {sessions.length ? (
          sessions.map((session) => {
            const branch = getActiveBranch(session);
            const isActive = session.id === activeSessionId;

            return (
              <div
                key={session.id}
                className={`rounded-xl border p-3 transition ${
                  isActive
                    ? "border-cyan-300/35 bg-cyan-300/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(session.id)}
                  className="w-full text-left"
                >
                  <p className="text-sm font-semibold text-white">{session.title}</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-500">
                    {branch.messages.length} 条 · {branch.label}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-slate-600">
                    {session.branches.length} 分支
                  </p>
                </button>
                {sessions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => onDelete(session.id)}
                    className="mt-2 inline-flex items-center gap-1 text-[10px] text-rose-300/80 hover:text-rose-200"
                  >
                    <Trash2 className="h-3 w-3" />
                    删除
                  </button>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-500">暂无会话</p>
        )}
      </div>
    </aside>
  );
}

export function BranchSwitcher({
  session,
  onSwitch,
}: {
  session: ChatSession;
  onSwitch: (branchId: string) => void;
}) {
  if (session.branches.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {session.branches.map((branch) => (
        <button
          key={branch.id}
          type="button"
          onClick={() => onSwitch(branch.id)}
          className={`rounded-full border px-3 py-1.5 text-xs transition ${
            branch.id === session.activeBranchId
              ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
              : "border-white/10 text-slate-400 hover:text-white"
          }`}
        >
          {branch.label}
        </button>
      ))}
    </div>
  );
}
