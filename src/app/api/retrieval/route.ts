import { NextResponse } from "next/server";
import { z } from "zod";

import { getEmbedModel, getKeywordMinScore, getMinRetrievalScore } from "@/lib/rag-config";
import { searchChunks } from "@/lib/vector-search";

const retrievalSchema = z.object({
  query: z.string().trim().min(1, "query is required"),
  topK: z.number().int().min(1).max(20).optional(),
  knowledgeBaseId: z.string().trim().min(1).optional(),
  knowledgeBaseIds: z.array(z.string().trim().min(1)).optional(),
  minScore: z.number().min(0).max(1).optional(),
});

export async function POST(request: Request) {
  try {
    const body = retrievalSchema.parse(await request.json());
    const knowledgeBaseIds =
      body.knowledgeBaseIds ??
      (body.knowledgeBaseId ? [body.knowledgeBaseId] : undefined);
    const topK = body.topK ?? 5;
    const minScore = body.minScore ?? getMinRetrievalScore();
    const embedModel = getEmbedModel();

    const started = Date.now();
    const { results, meta: searchMeta } = await searchChunks(
      body.query,
      topK,
      knowledgeBaseIds,
      { minScore },
    );
    const latencyMs = Date.now() - started;

    return NextResponse.json({
      query: body.query,
      knowledgeBaseIds,
      results,
      meta: {
        latencyMs,
        topK,
        minScore,
        keywordMinScore: getKeywordMinScore(),
        embedModel,
        mode: searchMeta.mode,
        vectorCount: searchMeta.vectorCount,
        keywordCount: searchMeta.keywordCount,
        rawCount: searchMeta.vectorCount + searchMeta.keywordCount,
        hitCount: results.length,
        knowledgeBaseCount: knowledgeBaseIds?.length ?? 0,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid retrieval payload", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to run retrieval",
      },
      { status: 500 },
    );
  }
}
