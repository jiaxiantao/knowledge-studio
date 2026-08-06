export type RagEvalMatchMode =
  | "name_or_content"
  | "name_and_content"
  | "name_only"
  | "content_only";

export type RagEvalCaseSetId = "soft-exam" | "tech-blog" | "mixed";

export type RagEvalCase = {
  id: string;
  query: string;
  /** When false, success = empty recall or top-1 score below reject threshold. */
  expectHit?: boolean;
  /** Document name must include any of these (case-insensitive). */
  expectedDocumentNameIncludes?: string[];
  /** Chunk content must include any of these (case-insensitive). */
  expectedContentIncludes?: string[];
  /**
   * How name/content expectations combine.
   * Default: name_or_content.
   */
  matchMode?: RagEvalMatchMode;
  /**
   * For expectHit=false: top-1 score below this counts as correct reject.
   * Falls back to the run's minScore when omitted.
   */
  rejectBelowScore?: number;
  notes?: string;
  /** Which built-in set this case belongs to. */
  sets?: RagEvalCaseSetId[];
};

export type RagEvalHitSummary = {
  id: string;
  documentId: string;
  documentName: string;
  score: number;
  rank: number;
  relevant: boolean;
};

export type RagEvalCaseResult = {
  id: string;
  query: string;
  notes?: string;
  expectHit: boolean;
  /** Whether this case passed its own success criterion. */
  passed: boolean;
  hitAtK: boolean;
  reciprocalRank: number;
  firstRelevantRank: number | null;
  topScore: number | null;
  hits: RagEvalHitSummary[];
};

export type RagEvalSummary = {
  caseCount: number;
  /** Only expectHit=true cases. */
  retrievalCaseCount: number;
  /** Only expectHit=false cases. */
  rejectCaseCount: number;
  /** Hit@K over retrieval cases only. */
  hitAtK: number;
  /** MRR over retrieval cases only. */
  mrr: number;
  /** Correct-reject rate over reject cases only. */
  correctRejectRate: number | null;
  /** Overall pass rate across all cases. */
  passRate: number;
  topK: number;
  latencyMs: number;
  mode: "hybrid" | "vector";
  caseSet: RagEvalCaseSetId;
  knowledgeBaseIds: string[];
};

export type RagEvalCaseSetMeta = {
  id: RagEvalCaseSetId;
  label: string;
  description: string;
  /** Prefer selecting KBs whose name includes any of these. */
  preferredKbNameIncludes: string[];
};
