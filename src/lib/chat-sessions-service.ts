import type { Prisma } from "@prisma/client";

import type { ChatBranch, ChatSession } from "@/lib/chat-types";
import { getReadyDb } from "@/lib/db";
import { ensureDefaultKnowledgeBase } from "@/lib/documents-service";

function asBranches(value: unknown): ChatBranch[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value as ChatBranch[];
}

function mapRow(row: {
  id: string;
  knowledgeBaseId: string | null;
  title: string;
  activeBranchId: string;
  branches: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): ChatSession {
  const branches = asBranches(row.branches);
  const activeBranchId =
    branches.some((branch) => branch.id === row.activeBranchId)
      ? row.activeBranchId
      : (branches[0]?.id ?? row.activeBranchId);

  return {
    id: row.id,
    knowledgeBaseId: row.knowledgeBaseId,
    title: row.title,
    activeBranchId,
    branches,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listChatSessions(
  knowledgeBaseId: string,
  options: { includeOrphans?: boolean } = {},
): Promise<ChatSession[]> {
  const db = await getReadyDb();
  if (!db) {
    return [];
  }

  const rows = await db.chatSession.findMany({
    where: options.includeOrphans
      ? {
          OR: [{ knowledgeBaseId }, { knowledgeBaseId: null }],
        }
      : { knowledgeBaseId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(mapRow);
}

export async function getChatSession(
  id: string,
): Promise<ChatSession | null> {
  const db = await getReadyDb();
  if (!db) {
    return null;
  }

  const row = await db.chatSession.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
}

export async function upsertChatSession(
  session: ChatSession,
): Promise<ChatSession> {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const row = await db.chatSession.upsert({
    where: { id: session.id },
    create: {
      id: session.id,
      knowledgeBaseId: session.knowledgeBaseId ?? null,
      title: session.title,
      activeBranchId: session.activeBranchId,
      branches: session.branches as unknown as Prisma.InputJsonValue,
      ...(session.createdAt
        ? { createdAt: new Date(session.createdAt) }
        : {}),
    },
    update: {
      knowledgeBaseId: session.knowledgeBaseId ?? null,
      title: session.title,
      activeBranchId: session.activeBranchId,
      branches: session.branches as unknown as Prisma.InputJsonValue,
    },
  });

  return mapRow(row);
}

export async function createChatSession(
  session: ChatSession,
): Promise<ChatSession> {
  return upsertChatSession(session);
}

export async function deleteChatSession(id: string): Promise<boolean> {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  try {
    await db.chatSession.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function replaceAllChatSessions(
  sessions: ChatSession[],
): Promise<ChatSession[]> {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  await db.$transaction(async (tx) => {
    await tx.chatSession.deleteMany();
    if (!sessions.length) {
      return;
    }

    await tx.chatSession.createMany({
      data: sessions.map((session) => ({
        id: session.id,
        knowledgeBaseId: session.knowledgeBaseId ?? null,
        title: session.title,
        activeBranchId: session.activeBranchId,
        branches: session.branches as unknown as Prisma.InputJsonValue,
        ...(session.createdAt
          ? { createdAt: new Date(session.createdAt) }
          : {}),
      })),
    });
  });

  const knowledgeBaseId = sessions[0]?.knowledgeBaseId;
  if (!knowledgeBaseId) {
    return listChatSessions((await ensureDefaultKnowledgeBase()).id, {
      includeOrphans: true,
    });
  }

  return listChatSessions(knowledgeBaseId);
}

export async function attachOrphanSessionsToKnowledgeBase(
  knowledgeBaseId: string,
) {
  const db = await getReadyDb();
  if (!db) {
    return;
  }

  await db.chatSession.updateMany({
    where: { knowledgeBaseId: null },
    data: { knowledgeBaseId },
  });
}
