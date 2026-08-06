"use client";

import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
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
  type DocumentRecord,
} from "@/lib/documents-service";
import { isDocumentIngestStuck } from "@/lib/document-status";
import { isStaticSite } from "@/lib/site-mode";

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function isProcessing(status: DocumentRecord["status"]) {
  return status === "pending" || status === "parsing";
}

function isRetryable(doc: DocumentRecord) {
  return doc.status === "failed" || isDocumentIngestStuck(doc);
}

function DocumentStatusCell({ doc }: { doc: DocumentRecord }) {
  if (isProcessing(doc.status)) {
    const progress = Math.min(100, Math.max(0, doc.progress ?? 0));
    const stuck = isDocumentIngestStuck(doc);
    return (
      <div className="min-w-[8.5rem]">
        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-amber-100/90">
          <span className="whitespace-nowrap">
            {stuck
              ? "解析卡住"
              : doc.status === "pending"
                ? "等待解析"
                : "解析中"}
          </span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-amber-300/80 transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>
      </div>
    );
  }

  if (doc.status === "failed") {
    return (
      <span className="inline-flex whitespace-nowrap rounded-md border border-rose-300/30 px-2.5 py-1 text-xs leading-none text-rose-100">
        失败
      </span>
    );
  }

  return (
    <span className="inline-flex whitespace-nowrap rounded-md border border-emerald-300/30 px-2.5 py-1 text-xs leading-none text-emerald-100">
      解析完成
    </span>
  );
}

function CopyDocumentIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={copied ? "已复制" : `复制文档 ID：${id}`}
      className="inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-slate-200"
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

type DeleteTarget =
  | { type: "single"; document: DocumentRecord }
  | { type: "batch"; ids: string[] };

export function DocumentLibrary({
  knowledgeBaseId,
}: {
  knowledgeBaseId: string;
}) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(() => !isStaticSite());
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const staticSite = isStaticSite();

  const mergeDocuments = useCallback((incoming: DocumentRecord[]) => {
    setDocuments((current) => {
      const byId = new Map(current.map((doc) => [doc.id, doc]));
      for (const doc of incoming) {
        byId.set(doc.id, doc);
      }
      return [...byId.values()].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });
  }, []);

  const loadDocuments = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (staticSite) {
        return;
      }

      if (!options.silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetch(
          `/api/documents?knowledgeBaseId=${encodeURIComponent(knowledgeBaseId)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as {
          documents?: DocumentRecord[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "加载文档失败");
        }
        setDocuments(payload.documents ?? []);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "加载文档失败",
        );
      } finally {
        if (!options.silent) {
          setLoading(false);
        }
      }
    },
    [knowledgeBaseId, staticSite],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDocuments();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDocuments]);

  useEffect(() => {
    if (staticSite) {
      return;
    }

    const hasActive = documents.some((doc) => isProcessing(doc.status));
    if (!hasActive) {
      return;
    }

    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const response = await fetch(
          `/api/documents?knowledgeBaseId=${encodeURIComponent(knowledgeBaseId)}`,
          { cache: "no-store" },
        );
          if (!response.ok) {
            return;
          }
          const payload = (await response.json()) as {
            documents?: DocumentRecord[];
          };
          setDocuments(payload.documents ?? []);
        } catch {
          // ignore transient poll errors
        }
      })();
    }, 1000);

    return () => window.clearInterval(timer);
  }, [documents, knowledgeBaseId, staticSite]);

  async function confirmDelete() {
    if (staticSite || !pendingDelete) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      if (pendingDelete.type === "single") {
        const id = pendingDelete.document.id;
        const response = await fetch(`/api/documents/${id}`, {
          method: "DELETE",
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "删除失败");
        }
        setDocuments((current) => current.filter((doc) => doc.id !== id));
        setSelectedIds((current) => current.filter((item) => item !== id));
      } else {
        const ids = pendingDelete.ids;
        const response = await fetch("/api/documents/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", ids }),
        });
        const payload = (await response.json()) as {
          deleted?: number;
          failed?: Array<{ id: string; error: string }>;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "批量删除失败");
        }

        const failedIds = new Set((payload.failed ?? []).map((item) => item.id));
        setDocuments((current) =>
          current.filter((doc) => !ids.includes(doc.id) || failedIds.has(doc.id)),
        );
        setSelectedIds((current) =>
          current.filter((id) => failedIds.has(id) || !ids.includes(id)),
        );

        if (payload.failed?.length) {
          setError(
            `已删除 ${payload.deleted ?? 0} 项，${payload.failed.length} 项失败`,
          );
        }
      }

      setPendingDelete(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "删除失败",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleBatchRetry() {
    if (staticSite || !validSelectedIds.length) {
      return;
    }

    const retryableIds = validSelectedIds.filter((id) => {
      const doc = documents.find((item) => item.id === id);
      return doc && isRetryable(doc);
    });

    if (!retryableIds.length) {
      setError("所选文档均不可重试（需失败或解析超时）");
      return;
    }

    setRetrying(true);
    setError(null);

    try {
      const response = await fetch("/api/documents/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", ids: retryableIds }),
      });
      const payload = (await response.json()) as {
        documents?: DocumentRecord[];
        queued?: number;
        failed?: Array<{ id: string; error: string }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "批量重试失败");
      }

      if (payload.documents?.length) {
        mergeDocuments(payload.documents);
      }

      if (payload.failed?.length) {
        setError(
          `已排队 ${payload.queued ?? 0} 项，${payload.failed.length} 项失败`,
        );
      }
    } catch (retryError) {
      setError(
        retryError instanceof Error ? retryError.message : "批量重试失败",
      );
    } finally {
      setRetrying(false);
    }
  }

  async function handleRetryDocument(documentId: string) {
    if (staticSite) {
      return;
    }

    setRetrying(true);
    setError(null);
    try {
      const response = await fetch("/api/documents/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", ids: [documentId] }),
      });
      const payload = (await response.json()) as {
        documents?: DocumentRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "重试失败");
      }
      if (payload.documents?.length) {
        mergeDocuments(payload.documents);
      }
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "重试失败");
    } finally {
      setRetrying(false);
    }
  }

  function exitBatchMode() {
    setBatchMode(false);
    setSelectedIds([]);
  }

  const filtered = useMemo(
    () =>
      documents.filter((doc) =>
        doc.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [documents, query],
  );

  const { page: safePage, items: pagedDocuments } = useMemo(
    () => paginateItems(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  const pageIds = pagedDocuments.map((doc) => doc.id);
  const validSelectedIds = selectedIds.filter((id) =>
    documents.some((doc) => doc.id === id),
  );
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => validSelectedIds.includes(id));
  const selectedCount = validSelectedIds.length;

  useEffect(() => {
    if (page !== safePage) {
      const timer = window.setTimeout(() => setPage(safePage), 0);
      return () => window.clearTimeout(timer);
    }
  }, [page, safePage]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timer);
  }, [query]);

  const colSpan = batchMode ? 7 : 6;

  return (
    <div className="grid gap-4">
      {staticSite ? <StaticSiteNotice feature="文档上传与索引" /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="按文件名搜索"
          className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadDocuments()}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:text-white"
          >
            刷新
          </button>
          {!staticSite ? (
            <button
              type="button"
              onClick={() => {
                if (batchMode) {
                  exitBatchMode();
                } else {
                  setBatchMode(true);
                }
              }}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:text-white"
            >
              {batchMode ? "退出批量操作" : "批量操作"}
            </button>
          ) : null}
          {staticSite ? (
            <button
              type="button"
              disabled
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              + 上传数据
            </button>
          ) : (
            <Link
              href={`/knowledge/upload?kb=${encodeURIComponent(knowledgeBaseId)}`}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
            >
              + 上传数据
            </Link>
          )}
        </div>
      </div>

      {batchMode ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-3 text-slate-300">
            <span>已选 {selectedCount} 项</span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={!selectedCount}
              className="text-slate-400 transition hover:text-white disabled:opacity-40"
            >
              取消选择
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!selectedCount || retrying || deleting}
              onClick={() => void handleBatchRetry()}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-slate-200 transition hover:border-white/20 hover:text-white disabled:opacity-40"
            >
              {retrying ? "排队中…" : "批量重试解析"}
            </button>
            <button
              type="button"
              disabled={!selectedCount || retrying || deleting}
              onClick={() =>
                setPendingDelete({ type: "batch", ids: [...validSelectedIds] })
              }
              className="rounded-xl border border-rose-300/30 px-3 py-1.5 text-rose-200 transition hover:bg-rose-400/10 disabled:opacity-40"
            >
              批量删除
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                {batchMode ? (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedIds((current) => [
                            ...new Set([...current, ...pageIds]),
                          ]);
                        } else {
                          setSelectedIds((current) =>
                            current.filter((id) => !pageIds.includes(id)),
                          );
                        }
                      }}
                      className="h-4 w-4 rounded border-white/20 bg-slate-950 accent-cyan-300"
                      aria-label="全选当前页"
                    />
                  </th>
                ) : null}
                <th className="px-4 py-3 font-medium">数据名称</th>
                <th className="px-4 py-3 font-medium">大小</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">状态</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">类目</th>
                <th className="px-4 py-3 font-medium">索引时间</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-slate-500">
                    正在加载文档…
                  </td>
                </tr>
              ) : pagedDocuments.length ? (
                pagedDocuments.map((doc) => {
                  const checked = validSelectedIds.includes(doc.id);
                  return (
                    <tr key={doc.id} className="border-t border-white/5">
                      {batchMode ? (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setSelectedIds((current) => [...current, doc.id]);
                              } else {
                                setSelectedIds((current) =>
                                  current.filter((id) => id !== doc.id),
                                );
                              }
                            }}
                            className="h-4 w-4 rounded border-white/20 bg-slate-950 accent-cyan-300"
                            aria-label={`选择 ${doc.name}`}
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{doc.name}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>
                            {doc.format.toUpperCase()}
                            {doc.chunkCount != null
                              ? ` · ${doc.chunkCount} 切片`
                              : ""}
                          </span>
                          <CopyDocumentIdButton id={doc.id} />
                          {!staticSite ? (
                            <a
                              href={`/api/documents/${doc.id}/file`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-cyan-200/90 transition hover:text-cyan-100"
                            >
                              本地文件
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : null}
                        </div>
                        {doc.errorMessage ? (
                          <p className="mt-1 text-xs text-rose-300">
                            {doc.errorMessage}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatBytes(doc.sizeBytes)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <DocumentStatusCell doc={doc} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                        {doc.category}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {doc.indexedAt
                          ? new Date(doc.indexedAt).toLocaleString("zh-CN")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/knowledge/chunks?id=${doc.id}&kb=${encodeURIComponent(knowledgeBaseId)}`}
                            className={`text-cyan-200 hover:text-white ${
                              isProcessing(doc.status)
                                ? "pointer-events-none opacity-40"
                                : ""
                            }`}
                          >
                            查看切片
                          </Link>
                          {isRetryable(doc) ? (
                            <button
                              type="button"
                              onClick={() => void handleRetryDocument(doc.id)}
                              disabled={staticSite || retrying}
                              className="text-amber-200 hover:text-amber-100 disabled:opacity-50"
                            >
                              重试解析
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              setPendingDelete({
                                type: "single",
                                document: doc,
                              })
                            }
                            disabled={staticSite}
                            className="text-rose-200 hover:text-rose-100 disabled:opacity-50"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-slate-500">
                    还没有文档。
                    {!staticSite ? (
                      <>
                        {" "}
                        <Link
                          href={`/knowledge/upload?kb=${encodeURIComponent(knowledgeBaseId)}`}
                          className="text-cyan-200 hover:text-white"
                        >
                          去上传
                        </Link>{" "}
                        .pdf / Office / 表格 / 图片 / 文本 开始构建知识库。
                      </>
                    ) : (
                      " 上传文档、表格、图片或文本开始构建知识库。"
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && filtered.length > 0 ? (
        <PaginationBar
          page={safePage}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setPendingDelete(null);
          }
        }}
      >
        <DialogContent
          onClose={() => {
            if (!deleting) {
              setPendingDelete(null);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              {pendingDelete?.type === "batch"
                ? `确定删除已选的 ${pendingDelete.ids.length} 个文档吗？将同时移除其切片与向量索引，此操作不可恢复。`
                : `确定删除「${pendingDelete?.type === "single" ? pendingDelete.document.name : ""}」吗？将同时移除其切片与向量索引，此操作不可恢复。`}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setPendingDelete(null)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void confirmDelete()}
              className="rounded-xl bg-rose-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-rose-300 disabled:opacity-50"
            >
              {deleting ? "删除中…" : "确认删除"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
