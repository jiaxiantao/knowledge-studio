"use client";

import Link from "next/link";
import { useState } from "react";

type SearchPayload = {
  engine: string;
  results: Array<{
    title: string;
    slug: string;
    score: number;
    similarity?: number;
  }>;
};

export function SearchCompareDemo() {
  const [query, setQuery] = useState("架构");
  const [pg, setPg] = useState<SearchPayload | null>(null);
  const [memory, setMemory] = useState<SearchPayload | null>(null);
  const [loading, setLoading] = useState(false);

  async function runCompare() {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    setLoading(true);

    try {
      const [pgRes, memRes] = await Promise.all([
        fetch(`/api/notes/search?q=${encodeURIComponent(trimmed)}&limit=6`),
        fetch(
          `/api/notes/search?q=${encodeURIComponent(trimmed)}&limit=6&engine=memory`,
        ),
      ]);

      setPg(await pgRes.json());
      setMemory(await memRes.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void runCompare();
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-[200px] flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {loading ? "对比中…" : "并行对比检索"}
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResultColumn title="PostgreSQL pg_trgm" payload={pg} />
        <ResultColumn title="内存 token 打分" payload={memory} />
      </div>
    </div>
  );
}

function formatScore(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "—";
}

function ResultColumn({
  title,
  payload,
}: {
  title: string;
  payload: SearchPayload | null;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{title}</p>
        {payload ? (
          <span className="font-mono text-[10px] text-slate-500">{payload.engine}</span>
        ) : null}
      </div>
      <ul className="mt-3 space-y-2">
        {payload?.results?.length ? (
          payload.results.map((item) => (
            <li
              key={item.slug}
              className="flex justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs"
            >
              <Link href={`/notes/${item.slug}`} className="text-slate-200 hover:text-white">
                {item.title}
              </Link>
              <span className="shrink-0 font-mono text-cyan-200/80">
                {formatScore(item.similarity ?? item.score)}
              </span>
            </li>
          ))
        ) : (
          <li className="text-sm text-slate-500">点击对比后显示结果</li>
        )}
      </ul>
    </article>
  );
}
