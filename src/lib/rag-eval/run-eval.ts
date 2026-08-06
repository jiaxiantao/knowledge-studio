import { average, summarizeHits } from "@/lib/rag-eval/metrics";
import { getRagEvalCases } from "@/lib/rag-eval/cases";
import type {
  RagEvalCase,
  RagEvalCaseResult,
  RagEvalCaseSetId,
  RagEvalSummary,
} from "@/lib/rag-eval/types";
import { getMinRetrievalScore } from "@/lib/rag-config";
import { searchChunks } from "@/lib/vector-search";

export type RunRagEvalOptions = {
  knowledgeBaseIds?: string[];
  topK?: number;
  minScore?: number;
  caseSet?: RagEvalCaseSetId;
  cases?: RagEvalCase[];
};

export async function runRagEval(options: RunRagEvalOptions = {}) {
  const caseSet = options.caseSet ?? "soft-exam";
  const cases = options.cases?.length
    ? options.cases
    : getRagEvalCases(caseSet);
  const topK = Math.min(Math.max(options.topK ?? 5, 1), 20);
  const minScore = options.minScore ?? getMinRetrievalScore();
  const knowledgeBaseIds = options.knowledgeBaseIds?.filter(Boolean);
  const started = Date.now();

  const results: RagEvalCaseResult[] = [];
  let mode: "hybrid" | "vector" = "vector";

  for (const evalCase of cases) {
    const { results: hits, meta } = await searchChunks(
      evalCase.query,
      topK,
      knowledgeBaseIds,
      { minScore },
    );
    mode = meta.mode;
    const scored = summarizeHits(hits, evalCase, { minScore });
    results.push({
      id: evalCase.id,
      query: evalCase.query,
      notes: evalCase.notes,
      expectHit: scored.expectHit,
      passed: scored.passed,
      hitAtK: scored.hitAtK,
      reciprocalRank: Number(scored.reciprocalRank.toFixed(4)),
      firstRelevantRank: scored.firstRelevantRank,
      topScore: scored.topScore,
      hits: scored.summaries,
    });
  }

  const retrievalResults = results.filter((item) => item.expectHit);
  const rejectResults = results.filter((item) => !item.expectHit);

  const summary: RagEvalSummary = {
    caseCount: results.length,
    retrievalCaseCount: retrievalResults.length,
    rejectCaseCount: rejectResults.length,
    hitAtK: Number(
      average(retrievalResults.map((item) => (item.hitAtK ? 1 : 0))).toFixed(4),
    ),
    mrr: Number(
      average(retrievalResults.map((item) => item.reciprocalRank)).toFixed(4),
    ),
    correctRejectRate: rejectResults.length
      ? Number(
          average(rejectResults.map((item) => (item.passed ? 1 : 0))).toFixed(
            4,
          ),
        )
      : null,
    passRate: Number(
      average(results.map((item) => (item.passed ? 1 : 0))).toFixed(4),
    ),
    topK,
    latencyMs: Date.now() - started,
    mode,
    caseSet,
    knowledgeBaseIds: knowledgeBaseIds ?? [],
  };

  return { summary, results, cases };
}