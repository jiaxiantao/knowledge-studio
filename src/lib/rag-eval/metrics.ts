import type { RetrievedChunk } from "@/lib/vector-search";
import type {
  RagEvalCase,
  RagEvalHitSummary,
  RagEvalMatchMode,
} from "@/lib/rag-eval/types";

function includesIgnoreCase(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

function anyIncludes(haystack: string, needles: string[]) {
  return needles.some((needle) => includesIgnoreCase(haystack, needle));
}

function resolveMatchMode(evalCase: RagEvalCase): RagEvalMatchMode {
  if (evalCase.matchMode) {
    return evalCase.matchMode;
  }
  const hasName = Boolean(evalCase.expectedDocumentNameIncludes?.length);
  const hasContent = Boolean(evalCase.expectedContentIncludes?.length);
  if (hasName && hasContent) {
    return "name_and_content";
  }
  if (hasName) {
    return "name_only";
  }
  if (hasContent) {
    return "content_only";
  }
  return "name_or_content";
}

/** Whether a hit satisfies the case's positive relevance rules. */
export function isRelevantHit(hit: RetrievedChunk, evalCase: RagEvalCase) {
  if (evalCase.expectHit === false) {
    return false;
  }

  const nameNeedles = evalCase.expectedDocumentNameIncludes ?? [];
  const contentNeedles = evalCase.expectedContentIncludes ?? [];
  const nameOk = nameNeedles.length
    ? anyIncludes(hit.documentName, nameNeedles)
    : false;
  const contentOk = contentNeedles.length
    ? anyIncludes(hit.content, contentNeedles)
    : false;
  const mode = resolveMatchMode(evalCase);

  switch (mode) {
    case "name_only":
      return nameOk;
    case "content_only":
      return contentOk;
    case "name_and_content":
      if (nameNeedles.length && contentNeedles.length) {
        return nameOk && contentOk;
      }
      return nameOk || contentOk;
    case "name_or_content":
    default:
      return nameOk || contentOk;
  }
}

export function summarizeHits(
  hits: RetrievedChunk[],
  evalCase: RagEvalCase,
  options: { minScore: number } = { minScore: 0.42 },
): {
  summaries: RagEvalHitSummary[];
  firstRelevantRank: number | null;
  hitAtK: boolean;
  reciprocalRank: number;
  topScore: number | null;
  passed: boolean;
  expectHit: boolean;
} {
  const expectHit = evalCase.expectHit !== false;
  const summaries = hits.map((hit, index) => ({
    id: hit.id,
    documentId: hit.documentId,
    documentName: hit.documentName,
    score: hit.score,
    rank: index + 1,
    relevant: isRelevantHit(hit, evalCase),
  }));

  const firstRelevantRank =
    summaries.find((item) => item.relevant)?.rank ?? null;
  const hitAtK = firstRelevantRank != null;
  const reciprocalRank =
    firstRelevantRank != null ? 1 / firstRelevantRank : 0;
  const topScore = summaries[0]?.score ?? null;

  let passed: boolean;
  if (expectHit) {
    passed = hitAtK;
  } else {
    const rejectBelow = evalCase.rejectBelowScore ?? options.minScore;
    passed =
      summaries.length === 0 ||
      (typeof topScore === "number" && topScore < rejectBelow);
  }

  return {
    summaries,
    firstRelevantRank,
    hitAtK,
    reciprocalRank,
    topScore,
    passed,
    expectHit,
  };
}

export function average(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}