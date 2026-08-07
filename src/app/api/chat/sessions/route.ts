import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import {
  attachOrphanSessionsToKnowledgeBase,
  createChatSession,
  listChatSessions,
  replaceAllChatSessions,
} from "@/lib/chat-sessions-service";
import { createEmptySession } from "@/lib/chat-sessions";
import { ensureDefaultKnowledgeBase } from "@/lib/documents-service";
import type { ChatSession } from "@/lib/chat-types";
import { assertKnowledgeBaseOwned } from "@/lib/ownership";
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

function staticBlocked() {
  return NextResponse.json(
    { error: "Static site does not support chat sessions API" },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  if (isStaticSite()) {
    return staticBlocked();
  }

  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const knowledgeBaseId = new URL(request.url).searchParams.get(
      "knowledgeBaseId",
    );
    if (!knowledgeBaseId) {
      return NextResponse.json(
        { error: "knowledgeBaseId is required" },
        { status: 400 },
      );
    }

    await assertKnowledgeBaseOwned(knowledgeBaseId, auth.user.id);

    const defaultKb = await ensureDefaultKnowledgeBase(auth.user.id);
    const includeOrphans = knowledgeBaseId === defaultKb.id;
    if (includeOrphans) {
      await attachOrphanSessionsToKnowledgeBase(knowledgeBaseId, auth.user.id);
    }

    const sessions = await listChatSessions(auth.user.id, knowledgeBaseId, {
      includeOrphans,
    });
    return NextResponse.json({ sessions });
  } catch (error) {
    if (error instanceof Error && error.name === "KnowledgeBaseAccessError") {
      const status =
        "status" in error && typeof error.status === "number"
          ? error.status
          : 404;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list sessions",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (isStaticSite()) {
    return staticBlocked();
  }

  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      session?: unknown;
      knowledgeBaseId?: string;
    };

    const knowledgeBaseId = body.knowledgeBaseId?.trim();
    if (knowledgeBaseId) {
      await assertKnowledgeBaseOwned(knowledgeBaseId, auth.user.id);
    }

    const session = body.session
      ? (sessionSchema.parse(body.session) as ChatSession)
      : createEmptySession("新对话", knowledgeBaseId);

    const created = await createChatSession(
      {
        ...session,
        knowledgeBaseId:
          session.knowledgeBaseId ?? knowledgeBaseId ?? null,
        updatedAt: session.updatedAt ?? new Date().toISOString(),
      },
      auth.user.id,
    );

    return NextResponse.json({ session: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid session" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.name === "KnowledgeBaseAccessError") {
      const status =
        "status" in error && typeof error.status === "number"
          ? error.status
          : 404;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create session",
      },
      { status: 500 },
    );
  }
}

/** One-shot replace (used for localStorage → DB migration). */
export async function PUT(request: Request) {
  if (isStaticSite()) {
    return staticBlocked();
  }

  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = z
      .object({ sessions: z.array(sessionSchema).min(1) })
      .parse(await request.json());

    const sessions = await replaceAllChatSessions(
      body.sessions.map((session) => ({
        ...(session as ChatSession),
        updatedAt: session.updatedAt ?? new Date().toISOString(),
      })),
      auth.user.id,
    );

    return NextResponse.json({ sessions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid sessions" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to replace sessions",
      },
      { status: 500 },
    );
  }
}
