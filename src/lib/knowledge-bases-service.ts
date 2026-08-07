import type { KnowledgeBase } from "@prisma/client";

import { getReadyDb } from "@/lib/db";
import type { KnowledgeBaseRecord } from "@/lib/knowledge-base-types";

function mapKnowledgeBase(
  row: KnowledgeBase & {
    _count: { documents: number };
    readyCount: number;
  },
): KnowledgeBaseRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    documentCount: row._count.documents,
    readyDocumentCount: row.readyCount,
  };
}

const kbInclude = {
  _count: { select: { documents: true } },
  documents: {
    where: { status: "ready" as const },
    select: { id: true },
  },
};

export async function listKnowledgeBases(
  userId: string,
): Promise<KnowledgeBaseRecord[]> {
  const db = await getReadyDb();
  if (!db) {
    return [];
  }

  const rows = await db.knowledgeBase.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: kbInclude,
  });

  return rows.map((row) =>
    mapKnowledgeBase({
      ...row,
      readyCount: row.documents.length,
    }),
  );
}

export async function getKnowledgeBase(
  id: string,
  userId: string,
): Promise<KnowledgeBaseRecord | null> {
  const db = await getReadyDb();
  if (!db) {
    return null;
  }

  const row = await db.knowledgeBase.findFirst({
    where: { id, userId },
    include: kbInclude,
  });

  if (!row) {
    return null;
  }

  return mapKnowledgeBase({
    ...row,
    readyCount: row.documents.length,
  });
}

export async function createKnowledgeBase(
  userId: string,
  input: {
    name: string;
    description?: string;
  },
): Promise<KnowledgeBaseRecord> {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const row = await db.knowledgeBase.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      userId,
    },
    include: kbInclude,
  });

  return mapKnowledgeBase({
    ...row,
    readyCount: row.documents.length,
  });
}

export async function updateKnowledgeBase(
  id: string,
  userId: string,
  input: { name?: string; description?: string | null },
): Promise<KnowledgeBaseRecord | null> {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const existing = await db.knowledgeBase.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return null;
  }

  const row = await db.knowledgeBase.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
    },
    include: kbInclude,
  });

  return mapKnowledgeBase({
    ...row,
    readyCount: row.documents.length,
  });
}

export async function deleteKnowledgeBase(
  id: string,
  userId: string,
): Promise<boolean> {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const existing = await db.knowledgeBase.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return false;
  }

  await db.knowledgeBase.delete({ where: { id } });
  return true;
}
