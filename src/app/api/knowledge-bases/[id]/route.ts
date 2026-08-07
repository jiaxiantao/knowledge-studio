import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import {
  deleteKnowledgeBase,
  getKnowledgeBase,
  updateKnowledgeBase,
} from "@/lib/knowledge-bases-service";
import { isStaticSite } from "@/lib/site-mode";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support knowledge bases API" },
      { status: 400 },
    );
  }

  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await context.params;
    const knowledgeBase = await getKnowledgeBase(id, auth.user.id);
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

  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await context.params;
    const body = z
      .object({
        name: z.string().trim().min(1).max(64).optional(),
        description: z.string().trim().max(200).nullable().optional(),
      })
      .parse(await request.json());

    const knowledgeBase = await updateKnowledgeBase(id, auth.user.id, body);
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

export async function DELETE(request: Request, context: RouteContext) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support knowledge bases API" },
      { status: 400 },
    );
  }

  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await context.params;
    const deleted = await deleteKnowledgeBase(id, auth.user.id);
    if (!deleted) {
      return NextResponse.json({ error: "知识库不存在" }, { status: 404 });
    }
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
