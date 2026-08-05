import { NextResponse } from "next/server";
import { z } from "zod";

import { searchChunksByVector } from "@/lib/vector-search";

const retrievalSchema = z.object({
  query: z.string().trim().min(1, "query is required"),
  topK: z.number().int().min(1).max(20).optional(),
  knowledgeBaseId: z.string().trim().min(1).optional(),
  knowledgeBaseIds: z.array(z.string().trim().min(1)).optional(),
});

export async function POST(request: Request) {
  try {
    const body = retrievalSchema.parse(await request.json());
    const knowledgeBaseIds =
      body.knowledgeBaseIds ??
      (body.knowledgeBaseId ? [body.knowledgeBaseId] : undefined);

    const results = await searchChunksByVector(
      body.query,
      body.topK ?? 5,
      knowledgeBaseIds,
    );
    return NextResponse.json({
      query: body.query,
      knowledgeBaseIds,
      results,
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
