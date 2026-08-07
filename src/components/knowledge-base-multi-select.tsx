"use client";

import { BookOpen, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { KnowledgeBaseRecord } from "@/lib/knowledge-base-types";
import { isStaticSite } from "@/lib/site-mode";
import { apiFetch } from "@/lib/api-fetch";

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
              <X className="h-4 w-4" />
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

type KnowledgeBaseMultiSelectProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxCount?: number;
  /** `panel` = card list（检索侧栏）；`toolbar` = 单行 chips（问答顶栏） */
  variant?: "panel" | "toolbar";
  className?: string;
};

export function KnowledgeBaseMultiSelect({
  selectedIds,
  onChange,
  maxCount = 15,
  variant = "panel",
  className = "",
}: KnowledgeBaseMultiSelectProps) {
  const staticSite = isStaticSite();
  const [allKnowledgeBases, setAllKnowledgeBases] = useState<
    KnowledgeBaseRecord[]
  >([]);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const [loading, setLoading] = useState(!staticSite);

  useEffect(() => {
    if (staticSite) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void apiFetch("/api/knowledge-bases", { cache: "no-store" })
        .then((response) => response.json())
        .then((payload: { knowledgeBases?: KnowledgeBaseRecord[] }) => {
          if (!cancelled) {
            setAllKnowledgeBases(payload.knowledgeBases ?? []);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setAllKnowledgeBases([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [staticSite]);

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

  const canAddMore = availableToAdd.length > 0 && selectedIds.length < maxCount;
  const totalLabel = Math.min(
    maxCount,
    allKnowledgeBases.length || selectedIds.length,
  );

  function addKnowledgeBase(id: string) {
    if (selectedIds.includes(id) || selectedIds.length >= maxCount) {
      return;
    }
    onChange([...selectedIds, id]);
    setAddPickerOpen(false);
  }

  function removeKnowledgeBase(id: string) {
    if (selectedIds.length <= 1) {
      return;
    }
    onChange(selectedIds.filter((item) => item !== id));
  }

  const addDialog = (
    <Dialog open={addPickerOpen} onOpenChange={setAddPickerOpen}>
      <DialogContent onClose={() => setAddPickerOpen(false)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>添加知识库</DialogTitle>
          <DialogDescription>
            选择要参与联合问答的知识库，最多 {maxCount} 个。
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
          {availableToAdd.length ? (
            availableToAdd.map((knowledgeBase) => (
              <button
                key={knowledgeBase.id}
                type="button"
                onClick={() => addKnowledgeBase(knowledgeBase.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-cyan-300/30 hover:bg-cyan-300/5"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-400/15 text-violet-200">
                  <BookOpen className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">
                    {knowledgeBase.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    已索引 {knowledgeBase.readyDocumentCount} /{" "}
                    {knowledgeBase.documentCount} 篇
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">
              没有可添加的知识库
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  if (variant === "toolbar") {
    return (
      <div className={`flex min-w-0 items-center gap-2 ${className}`}>
        <span className="shrink-0 text-xs text-slate-500">
          知识库 {selectedIds.length}/{totalLabel}
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:thin]">
          {loading && !selectedKnowledgeBases.length ? (
            <span className="text-xs text-slate-600">加载中…</span>
          ) : selectedKnowledgeBases.length ? (
            selectedKnowledgeBases.map((knowledgeBase) => (
              <span
                key={knowledgeBase.id}
                className="inline-flex max-w-[10rem] shrink-0 items-center gap-1 rounded-full border border-cyan-300/25 bg-cyan-300/10 py-1 pl-2.5 pr-1 text-xs text-cyan-100"
                title={`${knowledgeBase.name} · 已索引 ${knowledgeBase.readyDocumentCount}/${knowledgeBase.documentCount}`}
              >
                <BookOpen className="h-3 w-3 shrink-0 opacity-70" />
                <span className="truncate">{knowledgeBase.name}</span>
                <button
                  type="button"
                  disabled={selectedIds.length <= 1}
                  onClick={() => removeKnowledgeBase(knowledgeBase.id)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-cyan-200/70 transition hover:bg-white/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`移除 ${knowledgeBase.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-600">未选择知识库</span>
          )}
        </div>
        <button
          type="button"
          disabled={staticSite || !canAddMore}
          onClick={() => setAddPickerOpen(true)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          添加
        </button>
        {addDialog}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-white">
          知识库{" "}
          <span className="text-slate-500">
            ({selectedIds.length}/{totalLabel})
          </span>
        </h2>
        <button
          type="button"
          disabled={staticSite || !canAddMore}
          onClick={() => setAddPickerOpen(true)}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          添加
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {loading && !selectedKnowledgeBases.length ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-500">
            加载知识库…
          </div>
        ) : selectedKnowledgeBases.length ? (
          selectedKnowledgeBases.map((knowledgeBase) => (
            <SelectedKnowledgeBaseCard
              key={knowledgeBase.id}
              knowledgeBase={knowledgeBase}
              canRemove={selectedIds.length > 1}
              onRemove={() => removeKnowledgeBase(knowledgeBase.id)}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-500">
            请添加至少一个知识库
          </div>
        )}
      </div>

      {addDialog}
    </div>
  );
}
