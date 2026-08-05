import { getReadyDb } from "@/lib/db";
import { embedText, toPgVectorLiteral } from "@/lib/embeddings";

export type RetrievedChunk = {
  id: string;
  documentId: string;
  documentName: string;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  index: number;
  title: string | null;
  content: string;
  score: number;
};

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

  const embedding = await embedText(trimmed);
  const vector = toPgVectorLiteral(embedding);
  const limit = Math.min(Math.max(topK, 1), 20);

  const ids = [...new Set(knowledgeBaseIds?.filter(Boolean) ?? [])];
  let kbFilter = "";
  const params: Array<string | number> = [vector, limit];

  if (ids.length === 1) {
    kbFilter = `AND d."knowledgeBaseId" = $3`;
    params.push(ids[0]);
  } else if (ids.length > 1) {
    const placeholders = ids.map((_, index) => `$${index + 3}`).join(", ");
    kbFilter = `AND d."knowledgeBaseId" IN (${placeholders})`;
    params.push(...ids);
  }

  const rows = await db.$queryRawUnsafe<
    Array<{
      id: string;
      documentId: string;
      documentName: string;
      knowledgeBaseId: string;
      knowledgeBaseName: string;
      index: number;
      title: string | null;
      content: string;
      distance: number;
    }>
  >(
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
      ${kbFilter}
    ORDER BY c.embedding <=> $1::vector
    LIMIT $2
    `,
    ...params,
  );

  return rows.map((row) => ({
    id: row.id,
    documentId: row.documentId,
    documentName: row.documentName,
    knowledgeBaseId: row.knowledgeBaseId,
    knowledgeBaseName: row.knowledgeBaseName,
    index: row.index,
    title: row.title,
    content: row.content,
    score: Number((1 / (1 + Number(row.distance))).toFixed(4)),
  }));
}
