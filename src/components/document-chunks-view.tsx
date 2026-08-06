"use client";

import {
  Check,
  Copy,
  Eye,
  FileText,
  LayoutPanelLeft,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PaginationBar, paginateItems } from "@/components/pagination-bar";
import { StaticSiteNotice } from "@/components/static-site-notice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CHUNK_CONTENT_MAX,
  CHUNK_TITLE_MAX,
  type ChunkRecord,
} from "@/lib/chunk-types";
import type { DocumentRecord } from "@/lib/documents-service";
import { isStaticSite } from "@/lib/site-mode";

type EditorMode = "create" | "edit";

type EditorState = {
  mode: EditorMode;
  chunkId?: string;
  title: string;
  content: string;
};

function DocumentIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={copied ? "已复制" : `复制文档 ID：${id}`}
      className="inline-flex items-center gap-1 text-xs text-slate-500 transition hover:text-slate-300"
    >
      <span>文档 ID</span>
      {copied ? (
        <Check className="h-3 w-3 text-emerald-300" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

function SliceToggle({
  enabled,
  disabled,
  onChange,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition disabled:opacity-50 ${
        enabled ? "bg-cyan-400/80" : "bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
          enabled ? "left-4" : "left-0.5"
        }`}
      />
    </button>
  );
}

export function DocumentChunksView({
  id,
}: {
  id: string;
  knowledgeBaseId?: string;
}) {
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [chunks, setChunks] = useState<ChunkRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !isStaticSite());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChunkRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyChunkId, setBusyChunkId] = useState<string | null>(null);
  const staticSite = isStaticSite();

  const loadChunks = useCallback(async () => {
    if (staticSite || !id) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${id}/chunks`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        document?: DocumentRecord;
        chunks?: ChunkRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "加载切片失败");
      }
      setDocument(payload.document ?? null);
      setChunks(payload.chunks ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载切片失败");
    } finally {
      setLoading(false);
    }
  }, [id, staticSite]);

  useEffect(() => {
    if (staticSite || !id) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadChunks();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [id, loadChunks, staticSite]);

  const filteredChunks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return chunks;
    }
    return chunks.filter(
      (chunk) =>
        chunk.title.toLowerCase().includes(keyword) ||
        chunk.content.toLowerCase().includes(keyword),
    );
  }, [chunks, query]);

  const { page: safePage, items: pagedChunks } = useMemo(
    () => paginateItems(filteredChunks, page, pageSize),
    [filteredChunks, page, pageSize],
  );

  useEffect(() => {
    if (page !== safePage) {
      const timer = window.setTimeout(() => setPage(safePage), 0);
      return () => window.clearTimeout(timer);
    }
  }, [page, safePage]);

  function openCreate() {
    setEditorError(null);
    setEditor({ mode: "create", title: "", content: "" });
  }

  function openEdit(chunk: ChunkRecord) {
    setEditorError(null);
    setEditor({
      mode: "edit",
      chunkId: chunk.id,
      title: chunk.title,
      content: chunk.content,
    });
  }

  async function handleSaveEditor() {
    if (!editor || !id) {
      return;
    }

    setSaving(true);
    setEditorError(null);
    try {
      const body = {
        title: editor.title.trim(),
        content: editor.content,
      };

      const response =
        editor.mode === "create"
          ? await fetch(`/api/documents/${id}/chunks`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
          : await fetch(`/api/documents/${id}/chunks/${editor.chunkId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });

      const payload = (await response.json()) as {
        chunk?: ChunkRecord;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "保存失败");
      }

      setEditor(null);
      await loadChunks();
      if (editor.mode === "create") {
        setPage(1);
      }
    } catch (saveError) {
      setEditorError(
        saveError instanceof Error ? saveError.message : "保存失败",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !id) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/documents/${id}/chunks/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "删除失败");
      }
      setDeleteTarget(null);
      await loadChunks();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "删除失败",
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggle(chunk: ChunkRecord, enabled: boolean) {
    if (!id) {
      return;
    }

    setBusyChunkId(chunk.id);
    setChunks((current) =>
      current.map((item) =>
        item.id === chunk.id ? { ...item, enabled } : item,
      ),
    );

    try {
      const response = await fetch(`/api/documents/${id}/chunks/${chunk.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const payload = (await response.json()) as {
        chunk?: ChunkRecord;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "更新失败");
      }
      if (payload.chunk) {
        setChunks((current) =>
          current.map((item) =>
            item.id === payload.chunk!.id ? payload.chunk! : item,
          ),
        );
      }
    } catch (toggleError) {
      setChunks((current) =>
        current.map((item) =>
          item.id === chunk.id ? { ...item, enabled: chunk.enabled } : item,
        ),
      );
      setError(
        toggleError instanceof Error ? toggleError.message : "更新失败",
      );
    } finally {
      setBusyChunkId(null);
    }
  }

  return (
    <div className="grid gap-4">
      {staticSite ? <StaticSiteNotice feature="切片详情" /> : null}
      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="搜索切片"
            className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
          />
        </div>
        <p className="text-sm text-slate-400">共 {filteredChunks.length} 个切片</p>
        <button
          type="button"
          onClick={openCreate}
          disabled={staticSite || !document}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/95 px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          创建切片
        </button>
      </div>

      {document ? (
        <p className="text-sm text-slate-400">
          {document.name} · {chunks.length} 个切片
        </p>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-white/10 px-4 py-8 text-sm text-slate-500">
          正在加载切片…
        </div>
      ) : pagedChunks.length ? (
        <>
          <div className="grid gap-4">
            {pagedChunks.map((chunk) => (
              <article
                key={chunk.id}
                className="group relative rounded-2xl border border-white/10 bg-slate-950/40 p-5 transition hover:border-white/20"
              >
                <div className="pointer-events-none absolute right-4 top-0 z-10 -translate-y-1/2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
                  <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/95 px-1.5 py-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur">
                    <button
                      type="button"
                      onClick={() => openEdit(chunk)}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-cyan-200 transition hover:bg-white/5"
                    >
                      <LayoutPanelLeft className="h-3.5 w-3.5" />
                      切片详情
                    </button>
                    <a
                      href={`/api/documents/${id}/file`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      查看原文
                    </a>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(chunk)}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-rose-300 transition hover:bg-rose-400/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      删除
                    </button>
                    <span className="mx-1 h-4 w-px bg-white/10" />
                    <div className="px-1.5">
                      <SliceToggle
                        enabled={chunk.enabled}
                        disabled={busyChunkId === chunk.id}
                        onChange={(next) => void handleToggle(chunk, next)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-white/10 bg-white/5 px-1.5 font-medium text-slate-300">
                    {chunk.index + 1}
                  </span>
                  <span>{chunk.content.length} 字符</span>
                  {!chunk.enabled ? (
                    <span className="rounded-md border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-amber-100">
                      已停用
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => openEdit(chunk)}
                  className="mt-3 w-full text-left"
                >
                  {chunk.title ? (
                    <h3 className="text-sm font-semibold text-white">
                      {chunk.title}
                    </h3>
                  ) : null}
                  <div className="relative mt-2 max-h-40 overflow-hidden">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                      {chunk.content}
                    </p>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950/95 to-transparent" />
                  </div>
                </button>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="max-w-[18rem] truncate">
                      {document?.name ?? "未知文档"}
                    </span>
                  </span>
                  <DocumentIdButton id={id} />
                </div>
              </article>
            ))}
          </div>

          <PaginationBar
            page={safePage}
            pageSize={pageSize}
            total={filteredChunks.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
          <p className="text-sm text-slate-500">
            {query.trim()
              ? "没有匹配的切片"
              : "暂无切片。可点击右上角创建，或等待文档解析完成。"}
          </p>
          {!query.trim() && document ? (
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-200 hover:text-white"
            >
              <Plus className="h-4 w-4" />
              创建切片
            </button>
          ) : null}
        </div>
      )}

      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setEditor(null);
            setEditorError(null);
          }
        }}
      >
        <DialogContent
          onClose={() => {
            if (!saving) {
              setEditor(null);
              setEditorError(null);
            }
          }}
          className="flex max-h-[min(90vh,52rem)] max-w-2xl flex-col overflow-hidden bg-slate-950/95 p-0"
        >
          <div className="shrink-0 space-y-4 px-6 pb-2 pt-6">
            <DialogHeader>
              <DialogTitle>切片详情</DialogTitle>
              <DialogDescription>
                {editor?.mode === "create"
                  ? "新建检索单元，保存后将自动向量化。"
                  : "编辑切片标题与内容，保存后会更新向量索引。"}
              </DialogDescription>
            </DialogHeader>

            {editor && document ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-white/10 bg-white/5 px-1.5 font-medium text-slate-300">
                  {editor.mode === "edit"
                    ? (chunks.find((item) => item.id === editor.chunkId)
                        ?.index ?? 0) + 1
                    : chunks.length + 1}
                </span>
                <span>{editor.content.length} 字符</span>
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="max-w-[16rem] truncate">{document.name}</span>
                </span>
                <DocumentIdButton id={id} />
              </div>
            ) : null}

            {editorError ? (
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
                {editorError}
              </div>
            ) : null}
          </div>

          {editor ? (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
                <div className="grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm text-slate-300">切片标题</span>
                    <div className="relative">
                      <input
                        value={editor.title}
                        maxLength={CHUNK_TITLE_MAX}
                        onChange={(event) =>
                          setEditor({ ...editor, title: event.target.value })
                        }
                        placeholder="可选，默认取正文首行"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 pr-16 text-sm text-slate-100 outline-none focus:border-cyan-300/40"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                        {editor.title.length} / {CHUNK_TITLE_MAX}
                      </span>
                    </div>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm text-slate-300">
                      切片内容 <span className="text-rose-300">*</span>
                    </span>
                    <div className="relative">
                      <textarea
                        value={editor.content}
                        maxLength={CHUNK_CONTENT_MAX}
                        onChange={(event) =>
                          setEditor({ ...editor, content: event.target.value })
                        }
                        rows={10}
                        placeholder="输入切片正文"
                        className="max-h-[40vh] min-h-[12rem] w-full resize-y rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 pb-8 text-sm leading-7 text-slate-100 outline-none focus:border-cyan-300/40"
                      />
                      <span className="pointer-events-none absolute bottom-2.5 right-3 text-xs text-slate-500">
                        {editor.content.length} / {CHUNK_CONTENT_MAX}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-white/10 px-6 py-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setEditor(null);
                    setEditorError(null);
                  }}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={saving || !editor.content.trim()}
                  onClick={() => void handleSaveEditor()}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  确认
                </button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent
          onClose={() => {
            if (!deleting) {
              setDeleteTarget(null);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              删除后该切片将从检索索引中移除，且无法恢复。
              {deleteTarget
                ? ` 即将删除切片 #${deleteTarget.index + 1}。`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void handleDelete()}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              删除
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
