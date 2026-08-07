"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlaskConical, Info, Play } from "lucide-react";

import { StaticSiteNotice } from "@/components/static-site-notice";
import {
  RETRIEVAL_FUSION_ENV,
  RETRIEVAL_FUSION_STEPS,
} from "@/lib/rag-eval/fusion-explainer";
import type {
  RagEvalCase,
  RagEvalCaseResult,
  RagEvalCaseSetId,
  RagEvalCaseSetMeta,
  RagEvalSummary,
} from "@/lib/rag-eval/types";
import type { KnowledgeBaseRecord } from "@/lib/knowledge-base-types";
import { isStaticSite } from "@/lib/site-mode";
import { apiFetch } from "@/lib/api-fetch";

type RetrievalEvalPanelProps = {
  initialKnowledgeBaseId?: string;
};

export function RetrievalEvalPanel({
  initialKnowledgeBaseId = "",
}: RetrievalEvalPanelProps) {
  const staticSite = isStaticSite();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseRecord[]>(
    [],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialKnowledgeBaseId ? [initialKnowledgeBaseId] : [],
  );
  const [caseSet, setCaseSet] = useState<RagEvalCaseSetId>("soft-exam");
  const [caseSets, setCaseSets] = useState<RagEvalCaseSetMeta[]>([]);
  const [cases, setCases] = useState<RagEvalCase[]>([]);
  const [topK, setTopK] = useState(5);
  const [minScore, setMinScore] = useState(0.42);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RagEvalSummary | null>(null);
  const [results, setResults] = useState<RagEvalCaseResult[]>([]);
  const [kbTouched, setKbTouched] = useState(Boolean(initialKnowledgeBaseId));
  const [showFormatKbs, setShowFormatKbs] = useState(false);

  const applyPreferredKnowledgeBases = useCallback(
    (meta: RagEvalCaseSetMeta | undefined, bases: KnowledgeBaseRecord[]) => {
      if (!meta?.preferredKbNameIncludes.length || !bases.length) {
        return;
      }
      const preferred = bases
        .filter((kb) =>
          meta.preferredKbNameIncludes.some((needle) =>
            kb.name.toLowerCase().includes(needle.toLowerCase()),
          ),
        )
        .map((kb) => kb.id);
      if (preferred.length) {
        setSelectedIds(preferred);
      }
    },
    [],
  );

  const loadMeta = useCallback(
    async (nextCaseSet: RagEvalCaseSetId) => {
      if (staticSite) {
        return;
      }
      try {
        const [kbRes, evalRes] = await Promise.all([
          apiFetch("/api/knowledge-bases"),
          apiFetch(
            `/api/retrieval/eval?caseSet=${encodeURIComponent(nextCaseSet)}`,
          ),
        ]);
        const kbPayload = (await kbRes.json()) as {
          knowledgeBases?: KnowledgeBaseRecord[];
        };
        const evalPayload = (await evalRes.json()) as {
          cases?: RagEvalCase[];
          caseSets?: RagEvalCaseSetMeta[];
          defaults?: {
            topK?: number;
            minScore?: number;
            caseSet?: RagEvalCaseSetId;
          };
        };
        const bases = kbPayload.knowledgeBases ?? [];
        setKnowledgeBases(bases);
        setCaseSets(evalPayload.caseSets ?? []);
        setCases(evalPayload.cases ?? []);
        if (evalPayload.defaults?.topK) {
          setTopK(evalPayload.defaults.topK);
        }
        if (typeof evalPayload.defaults?.minScore === "number") {
          setMinScore(evalPayload.defaults.minScore);
        }

        if (initialKnowledgeBaseId && !kbTouched) {
          setSelectedIds([initialKnowledgeBaseId]);
        } else if (!kbTouched) {
          const meta = (evalPayload.caseSets ?? []).find(
            (item) => item.id === nextCaseSet,
          );
          applyPreferredKnowledgeBases(meta, bases);
        }
      } catch {
        setError("加载评测配置失败");
      }
    },
    [
      staticSite,
      initialKnowledgeBaseId,
      kbTouched,
      applyPreferredKnowledgeBases,
    ],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload eval meta when case set changes
    void loadMeta(caseSet);
  }, [loadMeta, caseSet]);

  const selectedLabel = useMemo(() => {
    if (!selectedIds.length) {
      return "全部知识库（不推荐）";
    }
    return selectedIds
      .map(
        (id) =>
          knowledgeBases.find((item) => item.id === id)?.name ?? id.slice(0, 8),
      )
      .join("、");
  }, [selectedIds, knowledgeBases]);

  const activeCaseSetMeta = caseSets.find((item) => item.id === caseSet);

  const primaryKnowledgeBases = useMemo(
    () =>
      knowledgeBases.filter((kb) => !kb.name.startsWith("格式测试")),
    [knowledgeBases],
  );
  const formatKnowledgeBases = useMemo(
    () => knowledgeBases.filter((kb) => kb.name.startsWith("格式测试")),
    [knowledgeBases],
  );

  function toggleKb(id: string) {
    setKbTouched(true);
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function onCaseSetChange(next: RagEvalCaseSetId) {
    setCaseSet(next);
    setSummary(null);
    setResults([]);
    setKbTouched(false);
    const meta = caseSets.find((item) => item.id === next);
    applyPreferredKnowledgeBases(meta, knowledgeBases);
  }

  async function runEval() {
    if (staticSite) {
      return;
    }
    if (!selectedIds.length) {
      setError("请先勾选与用例集匹配的知识库，避免「全部库」稀释命中率");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/api/retrieval/eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          knowledgeBaseIds: selectedIds,
          topK,
          minScore,
          caseSet,
        }),
      });
      const payload = (await response.json()) as {
        summary?: RagEvalSummary;
        results?: RagEvalCaseResult[];
        cases?: RagEvalCase[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "评测失败");
      }
      setSummary(payload.summary ?? null);
      setResults(payload.results ?? []);
      if (payload.cases?.length) {
        setCases(payload.cases);
      }
    } catch (runError) {
      setSummary(null);
      setResults([]);
      setError(runError instanceof Error ? runError.message : "评测失败");
    } finally {
      setLoading(false);
    }
  }

  if (staticSite) {
    return <StaticSiteNotice />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <FlaskConical className="h-4 w-4 text-cyan-200" />
              RAG 评测集
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              固定问题 → 真实检索 → Hit@K（前 K 命中率）/ MRR（平均倒数排名，仅「应命中」题）+
              正确拒答率（「应不命中」题）。用例对齐本地语料，可在{" "}
              <code className="text-slate-400">src/lib/rag-eval/cases.ts</code>{" "}
              增改。
            </p>
          </div>
          <Link
            href={
              selectedIds[0]
                ? `/retrieval/workbench?kb=${encodeURIComponent(selectedIds[0])}`
                : "/retrieval"
            }
            className="text-sm text-cyan-200 hover:text-white"
          >
            打开检索工作台
          </Link>
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
            用例集
          </div>
          <div className="flex flex-wrap gap-2">
            {caseSets.map((item) => {
              const active = caseSet === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onCaseSetChange(item.id)}
                  className={`rounded-full border px-3 py-1 text-xs whitespace-nowrap transition ${
                    active
                      ? "border-violet-300/40 bg-violet-400/15 text-violet-100"
                      : "border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          {activeCaseSetMeta ? (
            <p className="text-xs text-slate-500">
              {activeCaseSetMeta.description}
            </p>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
            知识库
          </div>
          <div className="flex flex-wrap gap-2">
            {primaryKnowledgeBases.map((kb) => {
              const active = selectedIds.includes(kb.id);
              return (
                <button
                  key={kb.id}
                  type="button"
                  onClick={() => toggleKb(kb.id)}
                  className={`rounded-full border px-3 py-1 text-xs whitespace-nowrap transition ${
                    active
                      ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-100"
                      : "border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {kb.name}
                </button>
              );
            })}
            {!primaryKnowledgeBases.length && !formatKnowledgeBases.length ? (
              <span className="text-sm text-slate-500">暂无知识库</span>
            ) : null}
            {formatKnowledgeBases.length ? (
              <button
                type="button"
                onClick={() => setShowFormatKbs((current) => !current)}
                className="rounded-full border border-dashed border-white/15 px-3 py-1 text-xs text-slate-500 transition hover:text-slate-300"
              >
                {showFormatKbs
                  ? "收起格式测试库"
                  : `格式测试库 ${formatKnowledgeBases.length}`}
              </button>
            ) : null}
          </div>
          {showFormatKbs && formatKnowledgeBases.length ? (
            <div className="flex flex-wrap gap-2 border-t border-white/5 pt-2">
              {formatKnowledgeBases.map((kb) => {
                const active = selectedIds.includes(kb.id);
                return (
                  <button
                    key={kb.id}
                    type="button"
                    onClick={() => toggleKb(kb.id)}
                    className={`rounded-full border px-3 py-1 text-xs whitespace-nowrap transition ${
                      active
                        ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-100"
                        : "border-white/10 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {kb.name.replace(/^格式测试 · /, "")}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-500">
            topK（召回条数）
            <input
              type="number"
              min={1}
              max={20}
              value={topK}
              onChange={(event) => setTopK(Number(event.target.value) || 5)}
              className="mt-1 block w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-500">
            minScore（最低分）
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={minScore}
              onChange={(event) =>
                setMinScore(Number(event.target.value) || 0)
              }
              className="mt-1 block w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-sm text-white"
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void runEval()}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {loading ? "评测中…" : "跑一轮评测"}
          </button>
          <span className="text-xs text-slate-500">范围：{selectedLabel}</span>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {summary ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard
              label={`Hit@${summary.topK}`}
              subLabel="前 K 命中率"
              value={summary.hitAtK}
              hint={`应命中 ${summary.retrievalCaseCount} 题`}
            />
            <MetricCard
              label="MRR"
              subLabel="平均倒数排名"
              value={summary.mrr}
              hint="仅应命中题"
            />
            <MetricCard
              label="正确拒答"
              value={summary.correctRejectRate}
              hint={`应不命中 ${summary.rejectCaseCount} 题`}
            />
            <MetricCard label="总通过率" value={summary.passRate} />
            <MetricCard
              label="用例数"
              value={summary.caseCount}
              format="int"
            />
            <MetricCard
              label="耗时 / 模式"
              valueLabel={`${summary.latencyMs}ms · ${summary.mode === "hybrid" ? "混合检索" : "仅向量"}`}
            />
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <Info className="h-4 w-4 text-violet-200" />
          检索融合怎么讲
        </h2>
        <ol className="mt-4 space-y-3">
          {RETRIEVAL_FUSION_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3 text-sm">
              <span className="font-mono text-slate-500">{index + 1}.</span>
              <div>
                <div className="font-medium text-slate-200">{step.title}</div>
                <p className="mt-0.5 text-slate-500">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          {RETRIEVAL_FUSION_ENV.map((item) => (
            <span
              key={item.key}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400"
              title={item.meaning}
            >
              <span className="font-mono">{item.key}</span>
              <span className="text-slate-600">（{item.label}）</span>
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/40">
        <div className="border-b border-white/10 px-4 py-3 text-sm text-slate-400">
          当前用例集（{cases.length}）
          {results.length ? " · 下方为最近一次运行明细" : ""}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[88px]" />
              <col className="w-[168px]" />
              <col />
              <col className="w-[72px]" />
              <col className="w-[72px]" />
              <col className="w-[80px]" />
              <col className="w-[240px]" />
            </colgroup>
            <thead className="border-b border-white/10 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-3 font-medium whitespace-nowrap">类型</th>
                <th className="px-3 py-3 font-medium whitespace-nowrap">ID</th>
                <th className="px-3 py-3 font-medium whitespace-nowrap">Query</th>
                <th className="px-3 py-3 text-center font-medium whitespace-nowrap">
                  结果
                </th>
                <th className="px-3 py-3 text-center font-medium whitespace-nowrap">
                  位次
                </th>
                <th className="px-3 py-3 text-center font-medium whitespace-nowrap">
                  Top1
                </th>
                <th className="px-3 py-3 font-medium whitespace-nowrap">
                  Top 命中
                </th>
              </tr>
            </thead>
            <tbody>
              {(results.length
                ? results
                : cases.map((item) => ({
                    id: item.id,
                    query: item.query,
                    notes: item.notes,
                    expectHit: item.expectHit !== false,
                    passed: false,
                    hitAtK: false,
                    reciprocalRank: 0,
                    firstRelevantRank: null as number | null,
                    topScore: null as number | null,
                    hits: [] as RagEvalCaseResult["hits"],
                  }))
              ).map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-3 py-3 align-middle">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] leading-none ${
                        row.expectHit
                          ? "bg-cyan-400/10 text-cyan-100"
                          : "bg-amber-400/10 text-amber-100"
                      }`}
                    >
                      {row.expectHit ? "应命中" : "应拒答"}
                    </span>
                  </td>
                  <td
                    className="truncate px-3 py-3 align-middle font-mono text-xs text-slate-500"
                    title={row.id}
                  >
                    {row.id}
                  </td>
                  <td className="px-3 py-3 align-middle text-slate-200">
                    <div className="line-clamp-2 leading-5">{row.query}</div>
                    {row.notes ? (
                      <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {row.notes}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-center align-middle whitespace-nowrap">
                    {results.length ? (
                      <span
                        className={
                          row.passed ? "text-emerald-300" : "text-rose-300"
                        }
                      >
                        {row.passed ? "通过" : "未通过"}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center align-middle font-mono text-slate-400 whitespace-nowrap">
                    {row.expectHit ? (row.firstRelevantRank ?? "—") : "—"}
                  </td>
                  <td className="px-3 py-3 text-center align-middle font-mono text-slate-400 whitespace-nowrap">
                    {typeof row.topScore === "number"
                      ? row.topScore.toFixed(3)
                      : results.length
                        ? "∅"
                        : "—"}
                  </td>
                  <td
                    className="truncate px-3 py-3 align-middle text-xs text-slate-500"
                    title={
                      row.hits?.[0]
                        ? `${row.hits[0].documentName} (${row.hits[0].score.toFixed(3)})`
                        : undefined
                    }
                  >
                    {row.hits?.[0]
                      ? `${row.hits[0].relevant ? "★ " : ""}${row.hits[0].documentName}`
                      : results.length
                        ? "无召回"
                        : "未运行"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  subLabel,
  value,
  valueLabel,
  hint,
  format = "ratio",
}: {
  label: string;
  subLabel?: string;
  value?: number | null;
  valueLabel?: string;
  hint?: string;
  format?: "ratio" | "int";
}) {
  const display =
    valueLabel ??
    (value == null
      ? "—"
      : format === "int"
        ? String(value)
        : `${(value * 100).toFixed(1)}%`);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <div className="text-[11px] text-slate-500">
        {label}
        {subLabel ? (
          <span className="text-slate-600">（{subLabel}）</span>
        ) : null}
      </div>
      <div className="mt-1 font-mono text-lg tabular-nums text-cyan-100">
        {display}
      </div>
      {hint ? <div className="mt-1 text-[11px] text-slate-600">{hint}</div> : null}
    </div>
  );
}