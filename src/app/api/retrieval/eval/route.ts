import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getRagEvalCases,
  RAG_EVAL_CASE_SET_META,
} from "@/lib/rag-eval/cases";
import { runRagEval } from "@/lib/rag-eval/run-eval";
import { getMinRetrievalScore } from "@/lib/rag-config";

export const runtime = "nodejs";
export const maxDuration = 300;

const caseSetSchema = z.enum(["soft-exam", "tech-blog", "mixed"]);

const evalCaseSchema = z.object({
  id: z.string().trim().min(1),
  query: z.string().trim().min(1),
  expectHit: z.boolean().optional(),
  expectedDocumentNameIncludes: z.array(z.string().trim().min(1)).optional(),
  expectedContentIncludes: z.array(z.string().trim().min(1)).optional(),
  matchMode: z
    .enum([
      "name_or_content",
      "name_and_content",
      "name_only",
      "content_only",
    ])
    .optional(),
  rejectBelowScore: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  sets: z.array(caseSetSchema).optional(),
});

const evalSchema = z.object({
  knowledgeBaseId: z.string().trim().min(1).optional(),
  knowledgeBaseIds: z.array(z.string().trim().min(1)).optional(),
  topK: z.number().int().min(1).max(20).optional(),
  minScore: z.number().min(0).max(1).optional(),
  caseSet: caseSetSchema.optional(),
  cases: z.array(evalCaseSchema).min(1).max(80).optional(),
});

export async function GET(request: Request) {
  const caseSetParam = new URL(request.url).searchParams.get("caseSet");
  const parsedSet = caseSetSchema.safeParse(caseSetParam ?? "soft-exam");
  const caseSet = parsedSet.success ? parsedSet.data : "soft-exam";

  return NextResponse.json({
    caseSets: RAG_EVAL_CASE_SET_META,
    caseSet,
    cases: getRagEvalCases(caseSet),
    defaults: {
      topK: 5,
      minScore: getMinRetrievalScore(),
      caseSet: "soft-exam",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = evalSchema.parse(await request.json());
    const knowledgeBaseIds =
      body.knowledgeBaseIds ??
      (body.knowledgeBaseId ? [body.knowledgeBaseId] : undefined);
    const caseSet = body.caseSet ?? "soft-exam";

    const { summary, results, cases } = await runRagEval({
      knowledgeBaseIds,
      topK: body.topK,
      minScore: body.minScore,
      caseSet,
      cases: body.cases,
    });

    return NextResponse.json({ summary, results, cases, caseSets: RAG_EVAL_CASE_SET_META });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid eval payload", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to run eval",
      },
      { status: 500 },
    );
  }
}