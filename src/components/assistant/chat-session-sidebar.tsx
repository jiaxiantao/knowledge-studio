"use client";

import {
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Share2,
  Trash2,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showToast, ToastHost } from "@/components/ui/toast";
import type { ChatSession } from "@/lib/chat-types";
import { isSessionPinned } from "@/lib/chat-sessions";

import { cn } from "@/lib/utils";

type ChatSessionSidebarProps = {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelect: (sessionId: string) => void;
  onCreate: () => void;
  onRename: (sessionId: string, title: string) => void;
  onTogglePin: (sessionId: string) => void;
  onPrepareShare: (session: ChatSession) => Promise<string>;
  onDelete: (sessionId: string) => void;
};

type SessionMenuProps = {
  pinned: boolean;
  className?: string;
  onOpenChange?: (open: boolean) => void;
  onRename: () => void;
  onTogglePin: () => void;
  onShare: () => void;
  onDelete: () => void;
};

function SessionMenu({
  pinned,
  className,
  onOpenChange,
  onRename,
  onTogglePin,
  onShare,
  onDelete,
}: SessionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  function updateOpen(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        onOpenChange?.(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  return (
    <div
      ref={rootRef}
      data-session-menu=""
      className={cn("relative shrink-0", className)}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          updateOpen(!open);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
        aria-label="更多操作"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 min-w-[9rem] overflow-hidden rounded-xl border border-white/10 bg-slate-950 py-1 shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                updateOpen(false);
                onRename();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
            >
              <Pencil className="h-4 w-4" />
              重命名
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                updateOpen(false);
                onTogglePin();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
            >
              {pinned ? (
                <PinOff className="h-4 w-4" />
              ) : (
                <Pin className="h-4 w-4" />
              )}
              {pinned ? "取消置顶" : "置顶"}
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                updateOpen(false);
                onShare();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
            >
              <Share2 className="h-4 w-4" />
              分享
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                updateOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-rose-400/10"
            >
              <Trash2 className="h-4 w-4" />
              删除
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

export function ChatSessionSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onCreate,
  onRename,
  onTogglePin,
  onPrepareShare,
  onDelete,
}: ChatSessionSidebarProps) {
  const [renameTarget, setRenameTarget] = useState<ChatSession | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(
    null,
  );

  function openRename(session: ChatSession) {
    setRenameTarget(session);
    setRenameValue(session.title);
  }

  async function handleShare(session: ChatSession) {
    try {
      const url = await onPrepareShare(session);
      await navigator.clipboard.writeText(url);
      showToast("已复制分享链接", "success");
    } catch (shareError) {
      showToast(
        shareError instanceof Error ? shareError.message : "复制失败",
        "error",
      );
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ToastHost />
      <aside className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Sessions
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            新建
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3 [scrollbar-gutter:stable_both-edges]">
        {sessions.length ? (
          sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const pinned = isSessionPinned(session.id);

            const menuVisible =
              isActive || openMenuSessionId === session.id;

            return (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  if (
                    (event.target as HTMLElement).closest("[data-session-menu]")
                  ) {
                    return;
                  }
                  onSelect(session.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(session.id);
                  }
                }}
                className={cn(
                  "group flex cursor-pointer items-center gap-1 rounded-xl border px-3 py-2.5 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40",
                  isActive
                    ? "border-cyan-300/35 bg-cyan-300/10"
                    : "border-white/10 bg-white/5 hover:border-white/20",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  {pinned ? (
                    <Pin className="h-3.5 w-3.5 shrink-0 text-cyan-200/80" />
                  ) : null}
                  <span className="truncate text-sm font-semibold leading-none text-white">
                    {session.title}
                  </span>
                </div>
                <SessionMenu
                  pinned={pinned}
                  className={cn(
                    "shrink-0 transition-opacity",
                    menuVisible
                      ? "pointer-events-auto opacity-100"
                      : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100",
                  )}
                  onOpenChange={(open) => {
                    setOpenMenuSessionId(open ? session.id : null);
                  }}
                  onRename={() => openRename(session)}
                  onTogglePin={() => onTogglePin(session.id)}
                  onShare={() => void handleShare(session)}
                  onDelete={() => onDelete(session.id)}
                />
              </div>
            );
          })
        ) : (
          <p className="px-1 text-sm text-slate-500">暂无会话</p>
        )}
        </div>
      </aside>

      <Dialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null);
          }
        }}
      >
        <DialogContent
          onClose={() => setRenameTarget(null)}
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle>重命名对话</DialogTitle>
            <DialogDescription>修改后在侧边栏显示新标题。</DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid gap-4">
            <input
              value={renameValue}
              maxLength={40}
              onChange={(event) => setRenameValue(event.target.value)}
              placeholder="输入对话标题"
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300/40"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!renameValue.trim()}
                onClick={() => {
                  if (!renameTarget) {
                    return;
                  }
                  onRename(renameTarget.id, renameValue.trim());
                  setRenameTarget(null);
                }}
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100 disabled:opacity-50"
              >
                确认
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
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
