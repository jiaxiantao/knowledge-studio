"use client";

import Link from "next/link";
import {
  BookOpen,
  Check,
  Copy,
  MessageSquare,
  Search,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DarkSelect } from "@/components/ui/dark-select";
import { StaticSiteNotice } from "@/components/static-site-notice";
import { showToast } from "@/components/ui/toast";
import type { KnowledgeBaseRecord } from "@/lib/knowledge-base-types";
import { isStaticSite } from "@/lib/site-mode";
import { apiFetch } from "@/lib/api-fetch";

type ServiceKind = "retrieval" | "assistant";

type ServiceEntryListProps = {
  kind: ServiceKind;
  modelLabel?: string;
};

function buildEntryTitle(knowledgeBase: KnowledgeBaseRecord, kind: ServiceKind) {
  const suffix = kind === "retrieval" ? "检索" : "问答";
  return `${knowledgeBase.name}_${suffix}`;
}

function buildEntryHref(knowledgeBaseId: string, kind: ServiceKind) {
  return kind === "retrieval"
    ? `/retrieval/workbench?kb=${knowledgeBaseId}`
    : `/assistant/chat?kb=${knowledgeBaseId}`;
}

function ServiceEntryCard({
  knowledgeBase,
  kind,
  modelLabel,
}: {
  knowledgeBase: KnowledgeBaseRecord;
  kind: ServiceKind;
  modelLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const published = knowledgeBase.readyDocumentCount > 0;
  const Icon = kind === "retrieval" ? Sparkles : MessageSquare;

  async function copyId() {
    try {
      await navigator.clipboard.writeText(knowledgeBase.id);
      setCopied(true);
      showToast("已复制服务 ID", "success");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast("复制失败", "error");
    }
  }

  return (
    <Link
      href={buildEntryHref(knowledgeBase.id, kind)}
      className="group block rounded-2xl border border-white/10 bg-slate-950/50 p-5 transition hover:border-cyan-300/25 hover:bg-slate-950/80"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-white group-hover:text-cyan-50">
              {buildEntryTitle(knowledgeBase, kind)}
            </h3>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
            published
              ? "bg-emerald-400/10 text-emerald-200"
              : "bg-white/5 text-slate-500"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              published ? "bg-emerald-300" : "bg-slate-500"
            }`}
          />
          {published ? "已发布" : "未发布"}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-slate-400">知识库</span>
          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300">
            <BookOpen className="h-3.5 w-3.5 text-violet-200" />
            {knowledgeBase.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-slate-400">ID</span>
          <span className="min-w-0 truncate font-mono text-xs text-slate-400">
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
            aria-label="复制服务 ID"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-300" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        {kind === "assistant" ? (
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-slate-400">API</span>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                window.location.href = `/developer/playground?kb=${encodeURIComponent(knowledgeBase.id)}`;
              }}
              className="text-xs text-cyan-200 hover:underline"
            >
              API 调用
            </button>
          </div>
        ) : null}
        {kind === "assistant" && modelLabel ? (
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-slate-400">模型</span>
            <span className="text-slate-300">{modelLabel}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-slate-400">版本</span>
            <span className="text-slate-300">V1</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export function ServiceEntryList({ kind, modelLabel }: ServiceEntryListProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [knowledgeBaseFilter, setKnowledgeBaseFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const staticSite = isStaticSite();
  const title = kind === "retrieval" ? "知识检索" : "知识问答";

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
    return knowledgeBases.filter((item) => {
      const published = item.readyDocumentCount > 0;
      if (statusFilter === "published" && !published) {
        return false;
      }
      if (statusFilter === "draft" && published) {
        return false;
      }
      if (knowledgeBaseFilter !== "all" && item.id !== knowledgeBaseFilter) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return [buildEntryTitle(item, kind), item.name, item.id]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [knowledgeBases, kind, knowledgeBaseFilter, search, statusFilter]);

  const knowledgeBaseOptions = useMemo(
    () => [
      { value: "all", label: "全部知识库" },
      ...knowledgeBases.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    ],
    [knowledgeBases],
  );

  return (
    <div className="grid gap-5">
      {staticSite ? <StaticSiteNotice feature={title} /> : null}

      <div className="flex flex-wrap items-center gap-3">
        <DarkSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "全部状态" },
            { value: "published", label: "已发布" },
            { value: "draft", label: "未发布" },
          ]}
          className="w-40"
        />
        <DarkSelect
          value={knowledgeBaseFilter}
          onChange={setKnowledgeBaseFilter}
          options={knowledgeBaseOptions}
          className="w-44"
        />
        <label className="relative block min-w-[18rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="请输入，支持模糊搜索"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2 pr-3 pl-9 text-sm text-white outline-none focus:border-cyan-300/40"
          />
        </label>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-16 text-center text-sm text-slate-500">
          加载服务列表…
        </div>
      ) : filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((knowledgeBase) => (
            <ServiceEntryCard
              key={knowledgeBase.id}
              knowledgeBase={knowledgeBase}
              kind={kind}
              modelLabel={modelLabel}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-16 text-center text-sm text-slate-500">
          {search.trim() || statusFilter !== "all" || knowledgeBaseFilter !== "all"
            ? "没有匹配的服务"
            : "暂无知识库，请先在知识管理中创建"}
        </div>
      )}
    </div>
  );
}
