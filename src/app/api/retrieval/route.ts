import { NextResponse } from "next/server";
import { z } from "zod";

import { getEmbedModel, getMinRetrievalScore } from "@/lib/rag-config";
import { searchChunksByVector } from "@/lib/vector-search";

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
    const rawResults = await searchChunksByVector(
      body.query,
      topK,
      knowledgeBaseIds,
    );
    const latencyMs = Date.now() - started;
    const results = rawResults.filter((hit) => hit.score >= minScore);

    return NextResponse.json({
      query: body.query,
      knowledgeBaseIds,
      results,
      meta: {
        latencyMs,
        topK,
        minScore,
        embedModel,
        mode: "vector",
        rawCount: rawResults.length,
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
