import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteChatSession,
  getChatSession,
  upsertChatSession,
} from "@/lib/chat-sessions-service";
import type { ChatSession } from "@/lib/chat-types";
import { isStaticSite } from "@/lib/site-mode";

const branchSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  messages: z.array(z.unknown()),
  forkedFromMessageId: z.string().optional(),
  parentBranchId: z.string().optional(),
});

const sessionSchema = z.object({
  id: z.string().min(1),
  knowledgeBaseId: z.string().nullable().optional(),
  title: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  activeBranchId: z.string().min(1),
  branches: z.array(branchSchema).min(1),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

function staticBlocked() {
  return NextResponse.json(
    { error: "Static site does not support chat sessions API" },
    { status: 400 },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  if (isStaticSite()) {
    return staticBlocked();
  }

  try {
    const { id } = await context.params;
    const session = await getChatSession(id);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load session",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  if (isStaticSite()) {
    return staticBlocked();
  }

  try {
    const { id } = await context.params;
    const body = sessionSchema.parse(await request.json());

    if (body.id !== id) {
      return NextResponse.json(
        { error: "Session id mismatch" },
        { status: 400 },
      );
    }

    const session = await upsertChatSession({
      ...(body as ChatSession),
      updatedAt: body.updatedAt ?? new Date().toISOString(),
    });

    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid session" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save session",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (isStaticSite()) {
    return staticBlocked();
  }

  try {
    const { id } = await context.params;
    const deleted = await deleteChatSession(id);

    if (!deleted) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete session",
      },
      { status: 500 },
    );
  }
}
