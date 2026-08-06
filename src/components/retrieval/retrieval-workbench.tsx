"use client";

import Link from "next/link";
import {
  ArrowUp,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Info,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StaticSiteNotice } from "@/components/static-site-notice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast";
import type { KnowledgeBaseRecord } from "@/lib/knowledge-base-types";
import { isStaticSite } from "@/lib/site-mode";

type RetrievalHit = {
  id: string;
  documentId: string;
  documentName: string;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  index: number;
  title: string | null;
  content: string;
  score: number;
  vectorScore?: number | null;
  keywordScore?: number | null;
  sources?: Array<"vector" | "keyword">;
};

type RetrievalMeta = {
  latencyMs: number;
  topK: number;
  minScore: number;
  keywordMinScore?: number;
  embedModel: string;
  mode: string;
  vectorCount?: number;
  keywordCount?: number;
  rawCount: number;
  hitCount: number;
  knowledgeBaseCount: number;
};

const QUERY_MAX = 1500;

function formatIndex(value: number) {
  return String(value + 1).padStart(2, "0");
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-3.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="text-sm text-slate-300">{label}</span>
        {hint ? (
          <span className="text-slate-600" title={hint}>
            <Info className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SelectedKnowledgeBaseCard({
  knowledgeBase,
  onRemove,
  canRemove,
}: {
  knowledgeBase: KnowledgeBaseRecord;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/5 p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200">
          <BookOpen className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {knowledgeBase.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                已索引 {knowledgeBase.readyDocumentCount} /{" "}
                {knowledgeBase.documentCount} 篇
              </p>
            </div>
            <button
              type="button"
              disabled={!canRemove}
              onClick={onRemove}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="移除知识库"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 truncate text-[11px] text-slate-600">
            {knowledgeBase.description?.trim() || "本地向量召回"}
          </p>
        </div>
      </div>
    </div>
  );
}

function RetrievalResultCard({
  hit,
  rank,
  showKnowledgeBase,
}: {
  hit: RetrievalHit;
  rank: number;
  showKnowledgeBase: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyDocumentId() {
    try {
      await navigator.clipboard.writeText(hit.documentId);
      setCopied(true);
      showToast("已复制文档 ID", "success");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast("复制失败", "error");
    }
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-mono text-lg font-semibold text-slate-500">
            {formatIndex(rank)}
          </span>
          {showKnowledgeBase ? (
            <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2 py-0.5 text-violet-100">
              {hit.knowledgeBaseName}
            </span>
          ) : null}
          <span className="text-cyan-200">
            检索分数 <strong className="font-mono">{hit.score.toFixed(4)}</strong>
          </span>
          {typeof hit.vectorScore === "number" ? (
            <span className="text-slate-500">
              向量 <strong className="font-mono text-slate-400">{hit.vectorScore.toFixed(3)}</strong>
            </span>
          ) : null}
          {typeof hit.keywordScore === "number" ? (
            <span className="text-slate-500">
              关键词 <strong className="font-mono text-slate-400">{hit.keywordScore.toFixed(3)}</strong>
            </span>
          ) : null}
          <span className="text-slate-500">{hit.content.length} 字符</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/knowledge/chunks?id=${hit.documentId}&kb=${hit.knowledgeBaseId}`}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            原切片
          </Link>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((current) => !current);
            }}
            className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            {expanded ? "收起" : "展开"}
          </button>
        </div>
      </div>

      {expanded ? (
        <>
          <div className="mt-4 space-y-2 text-sm leading-7 text-slate-300">
            <p>
              <span className="font-medium text-slate-200">【文档名】</span>
              {hit.documentName}
            </p>
            <p>
              <span className="font-medium text-slate-200">【标题】</span>
              {hit.title?.trim() || `切片 #${hit.index + 1}`}
            </p>
            <p className="whitespace-pre-wrap">
              <span className="font-medium text-slate-200">【正文】</span>
              {hit.content}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-xs text-slate-500">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-violet-400/15 text-violet-200">
                <BookOpen className="h-3.5 w-3.5" />
              </span>
              <span className="truncate text-slate-400">{hit.documentName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-500">文档 ID</span>
              <span className="max-w-40 truncate font-mono text-slate-400">
                {hit.documentId}
              </span>
              <button
                type="button"
                onClick={() => void copyDocumentId()}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-slate-400 transition hover:text-white"
                aria-label="复制文档 ID"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-sm leading-7 text-slate-400">
          {hit.content.trim() || hit.title?.trim() || hit.documentName}
        </p>
      )}
    </article>
  );
}

export function RetrievalWorkbench({
  knowledgeBaseId,
}: {
  knowledgeBaseId: string;
}) {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(5);
  const [minScore, setMinScore] = useState(0.42);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RetrievalHit[]>([]);
  const [meta, setMeta] = useState<RetrievalMeta | null>(null);
  const [allKnowledgeBases, setAllKnowledgeBases] = useState<
    KnowledgeBaseRecord[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([knowledgeBaseId]);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const staticSite = isStaticSite();

  useEffect(() => {
    if (staticSite) {
      return;
    }

    void fetch("/api/knowledge-bases", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { knowledgeBases?: KnowledgeBaseRecord[] }) => {
        setAllKnowledgeBases(payload.knowledgeBases ?? []);
      })
      .catch(() => undefined);
  }, [staticSite]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSelectedIds((current) =>
        current.includes(knowledgeBaseId)
          ? current
          : [knowledgeBaseId, ...current],
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [knowledgeBaseId]);

  const selectedKnowledgeBases = useMemo(
    () =>
      selectedIds
        .map((id) => allKnowledgeBases.find((item) => item.id === id))
        .filter((item): item is KnowledgeBaseRecord => Boolean(item)),
    [allKnowledgeBases, selectedIds],
  );

  const availableToAdd = useMemo(
    () =>
      allKnowledgeBases.filter(
        (knowledgeBase) => !selectedIds.includes(knowledgeBase.id),
      ),
    [allKnowledgeBases, selectedIds],
  );

  const readyDocumentCount = useMemo(
    () =>
      selectedKnowledgeBases.reduce(
        (sum, item) => sum + item.readyDocumentCount,
        0,
      ),
    [selectedKnowledgeBases],
  );

  const documentCount = useMemo(
    () =>
      selectedKnowledgeBases.reduce(
        (sum, item) => sum + item.documentCount,
        0,
      ),
    [selectedKnowledgeBases],
  );

  function addKnowledgeBase(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setAddPickerOpen(false);
  }

  function removeKnowledgeBase(id: string) {
    setSelectedIds((current) => {
      if (current.length <= 1) {
        showToast("至少保留一个知识库", "error");
        return current;
      }
      return current.filter((item) => item !== id);
    });
  }

  async function runRetrieval() {
    if (staticSite || !selectedIds.length) {
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/retrieval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed,
          topK,
          minScore,
          knowledgeBaseIds: selectedIds,
        }),
      });
      const payload = (await response.json()) as {
        results?: RetrievalHit[];
        meta?: RetrievalMeta;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "检索失败");
      }
      setResults(
        [...(payload.results ?? [])].sort((left, right) => right.score - left.score),
      );
      setMeta(payload.meta ?? null);
    } catch (retrievalError) {
      setResults([]);
      setMeta(null);
      setError(
        retrievalError instanceof Error
          ? retrievalError.message
          : "检索失败",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/30">
      <aside className="flex w-[22rem] shrink-0 flex-col border-r border-white/10 bg-slate-950/50">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <h2 className="text-sm font-medium text-white">
            知识库{" "}
            <span className="text-slate-500">
              ({selectedIds.length}/{allKnowledgeBases.length || selectedIds.length})
            </span>
          </h2>
          <button
            type="button"
            disabled={staticSite || !availableToAdd.length}
            onClick={() => setAddPickerOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            添加
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto border-b border-white/10 px-5 py-4 [scrollbar-gutter:stable_both-edges]">
          {selectedKnowledgeBases.length ? (
            selectedKnowledgeBases.map((knowledgeBase) => (
              <SelectedKnowledgeBaseCard
                key={knowledgeBase.id}
                knowledgeBase={knowledgeBase}
                canRemove={selectedIds.length > 1}
                onRemove={() => removeKnowledgeBase(knowledgeBase.id)}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-slate-500">
              请添加至少一个知识库
            </div>
          )}
          <p className="text-center text-[11px] text-slate-600">
            已选 {readyDocumentCount}/{documentCount} 篇可检索文档
          </p>
        </div>

        <div className="overflow-y-auto px-5 py-2 [scrollbar-gutter:stable_both-edges]">
          <SettingRow label="检索模式" hint="混合：向量 + 关键词加权融合">
            <span className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-1.5 text-sm text-slate-300">
              混合检索
            </span>
          </SettingRow>
          <SettingRow label="向量模型" hint="由 OLLAMA_EMBED_MODEL 配置">
            <span className="max-w-44 truncate rounded-lg border border-white/10 bg-slate-950/70 px-3 py-1.5 text-sm text-slate-300">
              {meta?.embedModel ?? "nomic-embed-text"}
            </span>
          </SettingRow>
          <SettingRow label="最大召回数量 1 ~ 20">
            <input
              type="number"
              min={1}
              max={20}
              value={topK}
              disabled={staticSite}
              onChange={(event) =>
                setTopK(
                  Math.min(
                    20,
                    Math.max(1, Number(event.target.value) || 5),
                  ),
                )
              }
              className="w-16 rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1.5 text-center text-sm text-white outline-none focus:border-cyan-300/40 disabled:opacity-50"
            />
          </SettingRow>
          <SettingRow
            label="最低相似度"
            hint="低于该分数的召回结果将被过滤"
          >
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={minScore}
              disabled={staticSite}
              onChange={(event) =>
                setMinScore(
                  Math.min(
                    1,
                    Math.max(0, Number(event.target.value) || 0),
                  ),
                )
              }
              className="w-20 rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1.5 text-center text-sm text-white outline-none focus:border-cyan-300/40 disabled:opacity-50"
            />
          </SettingRow>
          <div className="border-t border-white/5 py-3">
            <Link
              href={`/retrieval/eval?kb=${encodeURIComponent(knowledgeBaseId)}`}
              className="text-xs text-cyan-200/90 hover:text-white"
            >
              打开评测集 · 融合说明 →
            </Link>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-slate-900/35">
        {staticSite ? (
          <div className="border-b border-white/10 p-4">
            <StaticSiteNotice feature="检索" />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 [scrollbar-gutter:stable_both-edges]">
          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {meta ? (
            <div className="mx-auto mb-4 flex max-w-4xl flex-wrap gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-xs text-slate-400">
              <span>
                耗时{" "}
                <strong className="font-mono text-slate-200">
                  {meta.latencyMs} ms
                </strong>
              </span>
              <span>
                命中{" "}
                <strong className="font-mono text-slate-200">
                  {meta.hitCount}
                </strong>
                <span className="text-slate-600"> / raw {meta.rawCount}</span>
              </span>
              <span>
                topK{" "}
                <strong className="font-mono text-slate-200">{meta.topK}</strong>
              </span>
              <span>
                minScore{" "}
                <strong className="font-mono text-slate-200">
                  {meta.minScore.toFixed(2)}
                </strong>
              </span>
              <span>
                模式{" "}
                <strong className="font-mono text-slate-200">
                  {meta.mode === "hybrid" ? "混合检索" : "向量"}
                </strong>
              </span>
              {meta.mode === "hybrid" ? (
                <span>
                  召回{" "}
                  <strong className="font-mono text-slate-200">
                    {meta.vectorCount ?? 0}
                  </strong>
                  <span className="text-slate-600"> vec + </span>
                  <strong className="font-mono text-slate-200">
                    {meta.keywordCount ?? 0}
                  </strong>
                  <span className="text-slate-600"> kw</span>
                </span>
              ) : null}
              <span>
                知识库{" "}
                <strong className="font-mono text-slate-200">
                  {meta.knowledgeBaseCount}
                </strong>
              </span>
              <span className="text-slate-500">{meta.embedModel}</span>
            </div>
          ) : null}

          {results.length ? (
            <div className="mx-auto grid max-w-4xl gap-4">
              {results.map((hit, index) => (
                <RetrievalResultCard
                  key={hit.id}
                  hit={hit}
                  rank={index}
                  showKnowledgeBase={selectedIds.length > 1}
                />
              ))}
            </div>
          ) : meta && !loading ? (
            <div className="flex h-full min-h-72 items-center justify-center">
              <div className="max-w-md text-center">
                <p className="text-sm text-slate-400">没有通过阈值的召回结果</p>
                <p className="mt-2 text-xs leading-6 text-slate-600">
                  原始召回 {meta.rawCount} 条，可降低最低相似度或检查文档是否已索引。
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-72 items-center justify-center">
              <div className="max-w-md text-center">
                <p className="text-sm text-slate-400">在下方输入检索问题</p>
                <p className="mt-2 text-xs leading-6 text-slate-600">
                  将对已选的 {selectedIds.length} 个知识库联合召回，结果按融合检索分数排序。
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 bg-slate-950/40 px-6 py-4">
          <form
            className="mx-auto max-w-4xl"
            onSubmit={(event) => {
              event.preventDefault();
              void runRetrieval();
            }}
          >
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3 shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
              <textarea
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value.slice(0, QUERY_MAX))
                }
                rows={3}
                disabled={staticSite || loading || !selectedIds.length}
                placeholder="输入检索问题，例如：cos-design 是什么"
                className="w-full resize-none bg-transparent px-2 py-1 text-sm leading-7 text-white outline-none placeholder:text-slate-600 disabled:opacity-50"
              />
              <div className="mt-2 flex items-end justify-between gap-3 px-2">
                <span className="text-xs text-slate-600">
                  {loading ? "检索中…" : `${query.length}/${QUERY_MAX}`}
                </span>
                <button
                  type="submit"
                  disabled={
                    loading || staticSite || !query.trim() || !selectedIds.length
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="开始检索"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-slate-600">
              召回结果仅供调试参考，不代表最终问答输出
            </p>
          </form>
        </div>
      </section>

      <Dialog open={addPickerOpen} onOpenChange={setAddPickerOpen}>
        <DialogContent onClose={() => setAddPickerOpen(false)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加知识库</DialogTitle>
            <DialogDescription>
              选择要参与联合检索的知识库，可添加多个。
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto">
            {availableToAdd.length ? (
              availableToAdd.map((knowledgeBase) => (
                <button
                  key={knowledgeBase.id}
                  type="button"
                  onClick={() => addKnowledgeBase(knowledgeBase.id)}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-left transition hover:border-cyan-300/25 hover:bg-slate-950"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-400/15 text-violet-200">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">
                      {knowledgeBase.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      已索引 {knowledgeBase.readyDocumentCount} 篇文档
                    </span>
                  </span>
                  <Plus className="h-4 w-4 shrink-0 text-slate-500" />
                </button>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                没有可添加的知识库
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
