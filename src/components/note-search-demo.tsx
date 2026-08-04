"use client";

import { useState } from "react";

import { PerformanceLaneChart } from "@/components/charts/performance-lane-chart";
import { NoteSearchIntelligenceHints } from "@/components/note-search-intelligence-hints";
import type { NoteSearchResponse } from "@/lib/note-search";

export function NoteSearchDemo() {
  const [query, setQuery] = useState("架构");
  const [result, setResult] = useState<NoteSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/notes/search?q=${encodeURIComponent(trimmed)}&limit=8`,
      );
      const payload = (await response.json()) as NoteSearchResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "检索失败");
      }

      setResult(payload);
    } catch (searchError) {
      setError(
        searchError instanceof Error ? searchError.message : "检索失败",
      );
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  const chartLanes =
    result?.results.map((item) => ({
      title: item.title.slice(0, 12),
      score: Number((item.similarity ?? item.score).toFixed(3)) * 100 || item.score,
    })) ?? [];

  return (
    <div className="grid gap-6 rounded-[1.75rem] border border-white/10 bg-slate-950/40 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/75">
            PostgreSQL · pg_trgm
          </p>
          <p className="mt-2 font-mono text-xs text-slate-500">
            GET /api/notes/search?q=… · similarity() · % 运算符
          </p>
        </div>
        {result ? (
          <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-cyan-100/90">
            engine: {result.engine}
            {result.extensionEnabled ? " · ext ok" : ""}
          </span>
        ) : null}
      </div>

      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch(query);
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="输入关键词，例如：性能 / 架构 / Prisma"
          className="min-w-[240px] flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {isLoading ? "查询中…" : "trgm 检索"}
        </button>
      </form>

      {error ? (
        <p className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <NoteSearchIntelligenceHints query={query} />

      {result?.results.length ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <ul className="grid gap-2">
            {result.results.map((item) => (
              <li key={item.id}>
                <a
                  href={`/notes/${item.slug}`}
                  className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-300/25"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white">
                      {item.title}
                    </span>
                    <span className="font-mono text-xs text-cyan-200/80">
                      {(item.similarity ?? item.score).toFixed(3)}
                    </span>
                  </div>
                  {item.summary ? (
                    <p className="mt-2 text-xs leading-6 text-slate-400 line-clamp-2">
                      {item.summary}
                    </p>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>

          {chartLanes.length ? (
            <article className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/75">
                ECharts · similarity 排序
              </p>
              <PerformanceLaneChart lanes={chartLanes} />
            </article>
          ) : null}
        </div>
      ) : result ? (
        <p className="text-sm text-slate-500">没有命中结果，可换关键词或先写入笔记。</p>
      ) : null}
    </div>
  );
}
