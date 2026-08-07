"use client";

import Link from "next/link";
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { StaticSiteNotice } from "@/components/static-site-notice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showToast, ToastHost } from "@/components/ui/toast";
import type { KnowledgeBaseRecord } from "@/lib/knowledge-base-types";
import { isStaticSite } from "@/lib/site-mode";

import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";

function KnowledgeBaseCardMenu({
  knowledgeBaseId,
  className,
  onEdit,
  onDelete,
}: {
  knowledgeBaseId: string;
  className?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      data-kb-menu=""
      className={cn("relative shrink-0", className)}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
        aria-label="更多操作"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute right-0 bottom-full z-30 mb-1.5 min-w-36 overflow-hidden rounded-xl border border-white/10 bg-slate-950 py-1 shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <li role="none">
            <Link
              href={`/assistant/chat?kb=${knowledgeBaseId}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
            >
              <span className="inline-flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                知识问答
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
            </Link>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
            >
              <Pencil className="h-4 w-4" />
              编辑
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
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

function KnowledgeBaseCard({
  knowledgeBase,
  onEdit,
  onDelete,
}: {
  knowledgeBase: KnowledgeBaseRecord;
  onEdit: (knowledgeBase: KnowledgeBaseRecord) => void;
  onDelete: (knowledgeBase: KnowledgeBaseRecord) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(knowledgeBase.id);
      setCopied(true);
      showToast("已复制知识库 ID", "success");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast("复制失败", "error");
    }
  }

  return (
    <div className="group relative rounded-2xl border border-white/10 bg-slate-950/50 transition hover:border-cyan-300/25 hover:bg-slate-950/80">
      <Link
        href={`/knowledge/documents?kb=${knowledgeBase.id}`}
        className="block p-5 pr-12"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("[data-kb-menu]")) {
            event.preventDefault();
          }
        }}
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-white group-hover:text-cyan-50">
              {knowledgeBase.name}
            </h3>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
              {knowledgeBase.description?.trim() || knowledgeBase.name}
            </p>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <span className="text-slate-400">ID</span>
              <span className="truncate font-mono text-xs text-slate-400">
                {knowledgeBase.id}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void copyId();
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 text-slate-500 transition hover:text-white"
                aria-label="复制知识库 ID"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                  标准版
                </span>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                  基础问答
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <FileText className="h-3.5 w-3.5" />
                {knowledgeBase.documentCount}
              </span>
            </div>
          </div>
        </div>
      </Link>

      <KnowledgeBaseCardMenu
        knowledgeBaseId={knowledgeBase.id}
        className="absolute right-3 bottom-3"
        onEdit={() => onEdit(knowledgeBase)}
        onDelete={() => onDelete(knowledgeBase)}
      />
    </div>
  );
}

export function KnowledgeBaseHub() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [editTarget, setEditTarget] = useState<KnowledgeBaseRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBaseRecord | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const staticSite = isStaticSite();

  const loadKnowledgeBases = useCallback(async () => {
    if (staticSite) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch("/api/knowledge-bases", { cache: "no-store" });
      const payload = (await response.json()) as {
        knowledgeBases?: KnowledgeBaseRecord[];
      };
      setKnowledgeBases(payload.knowledgeBases ?? []);
    } catch {
      setKnowledgeBases([]);
    } finally {
      setLoading(false);
    }
  }, [staticSite]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadKnowledgeBases();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadKnowledgeBases]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return knowledgeBases;
    }
    return knowledgeBases.filter((item) =>
      [item.name, item.description ?? "", item.id]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [knowledgeBases, search]);

  function openEdit(knowledgeBase: KnowledgeBaseRecord) {
    setEditTarget(knowledgeBase);
    setEditName(knowledgeBase.name);
    setEditDescription(knowledgeBase.description ?? "");
  }

  async function handleCreate() {
    const name = createName.trim();
    if (!name) {
      return;
    }

    setCreating(true);
    try {
      const response = await apiFetch("/api/knowledge-bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: createDescription.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as {
        knowledgeBase?: KnowledgeBaseRecord;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "创建失败");
      }
      setCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
      await loadKnowledgeBases();
      showToast("知识库已创建", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "创建失败", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit() {
    if (!editTarget) {
      return;
    }

    const name = editName.trim();
    if (!name) {
      return;
    }

    setSaving(true);
    try {
      const response = await apiFetch(
        `/api/knowledge-bases/${encodeURIComponent(editTarget.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: editDescription.trim() || null,
          }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "保存失败");
      }
      setEditTarget(null);
      await loadKnowledgeBases();
      showToast("知识库已更新", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "保存失败", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      const response = await apiFetch(
        `/api/knowledge-bases/${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "删除失败");
      }
      setDeleteTarget(null);
      await loadKnowledgeBases();
      showToast("知识库已删除", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "删除失败", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <ToastHost />
      <div className="grid gap-5">
        {staticSite ? <StaticSiteNotice feature="知识库管理" /> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-slate-950 shadow-sm"
            >
              全部
            </button>
            <button
              type="button"
              disabled
              className="rounded-lg px-4 py-1.5 text-sm text-slate-500"
            >
              文档
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative block min-w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索知识库名称"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2 pr-3 pl-9 text-sm text-white outline-none focus:border-cyan-300/40"
              />
            </label>
            <button
              type="button"
              disabled={staticSite}
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              新建知识库
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-16 text-center text-sm text-slate-500">
            加载知识库…
          </div>
        ) : filtered.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((knowledgeBase) => (
              <KnowledgeBaseCard
                key={knowledgeBase.id}
                knowledgeBase={knowledgeBase}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-16 text-center text-sm text-slate-500">
            {search.trim() ? "没有匹配的知识库" : "暂无知识库，先创建一个吧"}
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent onClose={() => setCreateOpen(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle>新建知识库</DialogTitle>
              <DialogDescription>
                创建后可分别配置文档、检索与问答服务。
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-4">
              <input
                value={createName}
                maxLength={64}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="知识库名称"
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300/40"
              />
              <textarea
                value={createDescription}
                maxLength={200}
                rows={3}
                onChange={(event) => setCreateDescription(event.target.value)}
                placeholder="描述（可选）"
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300/40"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={!createName.trim() || creating}
                  onClick={() => void handleCreate()}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
                >
                  {creating ? "创建中…" : "确认"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(editTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setEditTarget(null);
            }
          }}
        >
          <DialogContent onClose={() => setEditTarget(null)} className="max-w-md">
            <DialogHeader>
              <DialogTitle>编辑知识库</DialogTitle>
              <DialogDescription>修改名称与描述。</DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-4">
              <input
                value={editName}
                maxLength={64}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="知识库名称"
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300/40"
              />
              <textarea
                value={editDescription}
                maxLength={200}
                rows={3}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder="描述（可选）"
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300/40"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={!editName.trim() || saving}
                  onClick={() => void handleSaveEdit()}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
                >
                  {saving ? "保存中…" : "确认"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
        >
          <DialogContent onClose={() => setDeleteTarget(null)} className="max-w-md">
            <DialogHeader>
              <DialogTitle>删除知识库</DialogTitle>
              <DialogDescription>
                将删除「{deleteTarget?.name}」及其全部文档与切片，此操作不可恢复。
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
              >
                取消
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {deleting ? "删除中…" : "确认删除"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
