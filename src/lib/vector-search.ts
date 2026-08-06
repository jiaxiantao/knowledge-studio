import type { PrismaClient } from "@prisma/client";

import { getReadyDb } from "@/lib/db";
import { embedText, toPgVectorLiteral } from "@/lib/embeddings";
import {
  getHybridRrfK,
  getKeywordMinScore,
  getMinRetrievalScore,
  isHybridRetrievalEnabled,
  type RetrievalMode,
} from "@/lib/rag-config";

export type { RetrievalMode };

export type RetrievedChunk = {
  id: string;
  documentId: string;
  documentName: string;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  index: number;
  title: string | null;
  content: string;
  /** Best comparable score for thresholding / UI (max of vector & keyword legs). */
  score: number;
  vectorScore?: number | null;
  keywordScore?: number | null;
  sources?: Array<"vector" | "keyword">;
};

export type SearchChunksOptions = {
  minScore?: number;
  keywordMinScore?: number;
  mode?: RetrievalMode;
};

export type SearchChunksMeta = {
  mode: RetrievalMode;
  vectorCount: number;
  keywordCount: number;
  fusedCount: number;
};

type ChunkRow = {
  id: string;
  documentId: string;
  documentName: string;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  index: number;
  title: string | null;
  content: string;
};

type VectorRow = ChunkRow & { distance: number };
type KeywordRow = ChunkRow & { keywordScore: number };

let trgmAvailable: boolean | null = null;

function escapeLikePattern(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function toVectorScore(distance: number) {
  return Number((1 / (1 + Number(distance))).toFixed(4));
}

function toDisplayScore(vectorScore?: number | null, keywordScore?: number | null) {
  return Math.max(vectorScore ?? 0, keywordScore ?? 0);
}

function mapChunkRow(row: ChunkRow): Omit<RetrievedChunk, "score"> {
  return {
    id: row.id,
    documentId: row.documentId,
    documentName: row.documentName,
    knowledgeBaseId: row.knowledgeBaseId,
    knowledgeBaseName: row.knowledgeBaseName,
    index: row.index,
    title: row.title,
    content: row.content,
  };
}

function buildKbFilter(ids: string[], startParamIndex: number) {
  if (ids.length === 0) {
    return { sql: "", params: [] as string[] };
  }

  if (ids.length === 1) {
    return {
      sql: `AND d."knowledgeBaseId" = $${startParamIndex}`,
      params: [ids[0]],
    };
  }

  const placeholders = ids
    .map((_, index) => `$${startParamIndex + index}`)
    .join(", ");

  return {
    sql: `AND d."knowledgeBaseId" IN (${placeholders})`,
    params: ids,
  };
}

async function isTrgmAvailable(db: PrismaClient) {
  if (trgmAvailable !== null) {
    return trgmAvailable;
  }

  try {
    const rows = await db.$queryRaw<Array<{ ok: number }>>`
      SELECT 1 AS ok FROM pg_extension WHERE extname = 'pg_trgm' LIMIT 1
    `;
    trgmAvailable = rows.length > 0;
  } catch {
    trgmAvailable = false;
  }

  return trgmAvailable;
}

/** Reciprocal rank fusion over ranked chunk id lists. */
export function reciprocalRankFusion(
  lists: Array<Array<{ id: string }>>,
  k = getHybridRrfK(),
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const list of lists) {
    list.forEach((item, index) => {
      const rank = index + 1;
      scores.set(item.id, (scores.get(item.id) ?? 0) + 1 / (k + rank));
    });
  }

  return scores;
}

function passesHybridThreshold(
  chunk: RetrievedChunk,
  minScore: number,
  keywordMinScore: number,
) {
  const vectorScore = chunk.vectorScore ?? 0;
  const keywordScore = chunk.keywordScore ?? 0;
  return vectorScore >= minScore || keywordScore >= keywordMinScore;
}

async function searchChunksByVectorInternal(
  db: PrismaClient,
  query: string,
  limit: number,
  knowledgeBaseIds?: string[],
): Promise<RetrievedChunk[]> {
  const embedding = await embedText(query);
  const vector = toPgVectorLiteral(embedding);
  const ids = [...new Set(knowledgeBaseIds?.filter(Boolean) ?? [])];
  const kb = buildKbFilter(ids, 3);
  const params: Array<string | number> = [vector, limit, ...kb.params];

  const rows = await db.$queryRawUnsafe<VectorRow[]>(
    `
    SELECT
      c.id,
      c."documentId" AS "documentId",
      d.name AS "documentName",
      d."knowledgeBaseId" AS "knowledgeBaseId",
      kb.name AS "knowledgeBaseName",
      c.index,
      c.title,
      c.content,
      (c.embedding <=> $1::vector) AS distance
    FROM "Chunk" c
    INNER JOIN "Document" d ON d.id = c."documentId"
    INNER JOIN "KnowledgeBase" kb ON kb.id = d."knowledgeBaseId"
    WHERE c.embedding IS NOT NULL
      AND c.enabled = true
      AND d.status = 'ready'
      ${kb.sql}
    ORDER BY c.embedding <=> $1::vector
    LIMIT $2
    `,
    ...params,
  );

  return rows.map((row) => {
    const vectorScore = toVectorScore(row.distance);
    return {
      ...mapChunkRow(row),
      score: vectorScore,
      vectorScore,
      keywordScore: null,
      sources: ["vector"] as Array<"vector" | "keyword">,
    };
  });
}

async function searchChunksByKeywordInternal(
  db: PrismaClient,
  query: string,
  limit: number,
  knowledgeBaseIds?: string[],
): Promise<RetrievedChunk[]> {
  const ids = [...new Set(knowledgeBaseIds?.filter(Boolean) ?? [])];
  const kb = buildKbFilter(ids, 4);
  const likePattern = `%${escapeLikePattern(query)}%`;
  const params: Array<string | number> = [query, likePattern, limit, ...kb.params];

  const rows = await db.$queryRawUnsafe<KeywordRow[]>(
    `
    SELECT
      c.id,
      c."documentId" AS "documentId",
      d.name AS "documentName",
      d."knowledgeBaseId" AS "knowledgeBaseId",
      kb.name AS "knowledgeBaseName",
      c.index,
      c.title,
      c.content,
      GREATEST(
        similarity(c.content, $1),
        similarity(COALESCE(c.title, ''), $1)
      ) AS "keywordScore"
    FROM "Chunk" c
    INNER JOIN "Document" d ON d.id = c."documentId"
    INNER JOIN "KnowledgeBase" kb ON kb.id = d."knowledgeBaseId"
    WHERE c.enabled = true
      AND d.status = 'ready'
      AND (
        c.content % $1
        OR COALESCE(c.title, '') % $1
        OR c.content ILIKE $2 ESCAPE '\\'
        OR COALESCE(c.title, '') ILIKE $2 ESCAPE '\\'
      )
      ${kb.sql}
    ORDER BY "keywordScore" DESC
    LIMIT $3
    `,
    ...params,
  );

  return rows.map((row) => {
    const keywordScore = Number(Number(row.keywordScore).toFixed(4));
    return {
      ...mapChunkRow(row),
      score: keywordScore,
      vectorScore: null,
      keywordScore,
      sources: ["keyword"] as Array<"vector" | "keyword">,
    };
  });
}

function mergeHybridChunks(
  vectorHits: RetrievedChunk[],
  keywordHits: RetrievedChunk[],
  topK: number,
  minScore: number,
  keywordMinScore: number,
): { results: RetrievedChunk[]; meta: SearchChunksMeta } {
  const byId = new Map<string, RetrievedChunk>();

  for (const hit of vectorHits) {
    byId.set(hit.id, { ...hit });
  }

  for (const hit of keywordHits) {
    const existing = byId.get(hit.id);
    if (existing) {
      existing.keywordScore = hit.keywordScore ?? existing.keywordScore;
      existing.sources = [
        ...new Set([...(existing.sources ?? []), ...(hit.sources ?? [])]),
      ];
      existing.score = toDisplayScore(existing.vectorScore, existing.keywordScore);
    } else {
      byId.set(hit.id, { ...hit });
    }
  }

  const rrfScores = reciprocalRankFusion([
    vectorHits.map((hit) => ({ id: hit.id })),
    keywordHits.map((hit) => ({ id: hit.id })),
  ]);

  const fused = [...byId.values()]
    .filter((chunk) => passesHybridThreshold(chunk, minScore, keywordMinScore))
    .sort((left, right) => {
      const rrfDelta =
        (rrfScores.get(right.id) ?? 0) - (rrfScores.get(left.id) ?? 0);
      if (rrfDelta !== 0) {
        return rrfDelta;
      }
      return right.score - left.score;
    })
    .slice(0, topK)
    .map((chunk) => ({
      ...chunk,
      score: toDisplayScore(chunk.vectorScore, chunk.keywordScore),
    }));

  return {
    results: fused,
    meta: {
      mode: "hybrid",
      vectorCount: vectorHits.length,
      keywordCount: keywordHits.length,
      fusedCount: fused.length,
    },
  };
}

export async function searchChunksByVector(
  query: string,
  topK = 5,
  knowledgeBaseIds?: string[],
): Promise<RetrievedChunk[]> {
  const db = await getReadyDb();
  if (!db) {
    return [];
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const limit = Math.min(Math.max(topK, 1), 20);
  return searchChunksByVectorInternal(db, trimmed, limit, knowledgeBaseIds);
}

/**
 * Hybrid retrieval: pgvector semantic leg + pg_trgm keyword leg, merged with RRF.
 * Falls back to vector-only when pg_trgm is unavailable or RAG_HYBRID=0.
 */
export async function searchChunks(
  query: string,
  topK = 5,
  knowledgeBaseIds?: string[],
  options: SearchChunksOptions = {},
): Promise<{ results: RetrievedChunk[]; meta: SearchChunksMeta }> {
  const db = await getReadyDb();
  const emptyMeta: SearchChunksMeta = {
    mode: "vector",
    vectorCount: 0,
    keywordCount: 0,
    fusedCount: 0,
  };

  if (!db) {
    return { results: [], meta: emptyMeta };
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [], meta: emptyMeta };
  }

  const limit = Math.min(Math.max(topK, 1), 20);
  const candidateLimit = Math.min(Math.max(limit * 3, limit), 60);
  const minScore = options.minScore ?? getMinRetrievalScore();
  const keywordMinScore = options.keywordMinScore ?? getKeywordMinScore();
  const hybridRequested =
    options.mode !== "vector" &&
    (options.mode === "hybrid" || isHybridRetrievalEnabled());
  const trgmReady = hybridRequested ? await isTrgmAvailable(db) : false;

  if (!hybridRequested || !trgmReady) {
    const vectorHits = await searchChunksByVectorInternal(
      db,
      trimmed,
      candidateLimit,
      knowledgeBaseIds,
    );
    const results = vectorHits
      .filter((hit) => hit.score >= minScore)
      .slice(0, limit);

    return {
      results,
      meta: {
        mode: "vector",
        vectorCount: vectorHits.length,
        keywordCount: 0,
        fusedCount: results.length,
      },
    };
  }

  const [vectorHits, keywordHits] = await Promise.all([
    searchChunksByVectorInternal(db, trimmed, candidateLimit, knowledgeBaseIds),
    searchChunksByKeywordInternal(db, trimmed, candidateLimit, knowledgeBaseIds),
  ]);

  return mergeHybridChunks(
    vectorHits,
    keywordHits,
    limit,
    minScore,
    keywordMinScore,
  );
}
