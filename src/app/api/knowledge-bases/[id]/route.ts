import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteKnowledgeBase,
  getKnowledgeBase,
  updateKnowledgeBase,
} from "@/lib/knowledge-bases-service";
import { isStaticSite } from "@/lib/site-mode";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support knowledge bases API" },
      { status: 400 },
    );
  }

  try {
    const { id } = await context.params;
    const knowledgeBase = await getKnowledgeBase(id);
    if (!knowledgeBase) {
      return NextResponse.json({ error: "知识库不存在" }, { status: 404 });
    }
    return NextResponse.json({ knowledgeBase });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get knowledge base",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support knowledge bases API" },
      { status: 400 },
    );
  }

  try {
    const { id } = await context.params;
    const body = z
      .object({
        name: z.string().trim().min(1).max(64).optional(),
        description: z.string().trim().max(200).nullable().optional(),
      })
      .parse(await request.json());

    const knowledgeBase = await updateKnowledgeBase(id, body);
    if (!knowledgeBase) {
      return NextResponse.json({ error: "知识库不存在" }, { status: 404 });
    }
    return NextResponse.json({ knowledgeBase });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid knowledge base" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update knowledge base",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support knowledge bases API" },
      { status: 400 },
    );
  }

  try {
    const { id } = await context.params;
    const existing = await getKnowledgeBase(id);
    if (!existing) {
      return NextResponse.json({ error: "知识库不存在" }, { status: 404 });
    }
    await deleteKnowledgeBase(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete knowledge base",
      },
      { status: 500 },
    );
  }
}
