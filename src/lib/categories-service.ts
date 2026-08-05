import { ensureDefaultKnowledgeBase } from "@/lib/documents-service";
import { getReadyDb } from "@/lib/db";

export const DEFAULT_CATEGORY_NAME = "默认类目";

export type CategoryRecord = {
  id: string;
  knowledgeBaseId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

function mapCategory(row: {
  id: string;
  knowledgeBaseId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): CategoryRecord {
  return {
    id: row.id,
    knowledgeBaseId: row.knowledgeBaseId,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function ensureDefaultCategory(knowledgeBaseId?: string) {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const kbId = knowledgeBaseId ?? (await ensureDefaultKnowledgeBase()).id;

  const existing = await db.documentCategory.findUnique({
    where: {
      knowledgeBaseId_name: {
        knowledgeBaseId: kbId,
        name: DEFAULT_CATEGORY_NAME,
      },
    },
  });

  if (existing) {
    return mapCategory(existing);
  }

  const created = await db.documentCategory.create({
    data: {
      knowledgeBaseId: kbId,
      name: DEFAULT_CATEGORY_NAME,
    },
  });

  return mapCategory(created);
}

export async function listCategories(
  knowledgeBaseId?: string,
): Promise<CategoryRecord[]> {
  const db = await getReadyDb();
  if (!db) {
    return [];
  }

  const kb = knowledgeBaseId
    ? await db.knowledgeBase.findUnique({ where: { id: knowledgeBaseId } })
    : await ensureDefaultKnowledgeBase();
  if (!kb) {
    return [];
  }

  await ensureDefaultCategory(kb.id);

  // Also absorb categories already used by documents but missing from table.
  const used = await db.document.findMany({
    where: { knowledgeBaseId: kb.id },
    select: { category: true },
    distinct: ["category"],
  });

  for (const item of used) {
    const name = item.category.trim();
    if (!name) {
      continue;
    }
    await db.documentCategory.upsert({
      where: {
        knowledgeBaseId_name: {
          knowledgeBaseId: kb.id,
          name,
        },
      },
      create: {
        knowledgeBaseId: kb.id,
        name,
      },
      update: {},
    });
  }

  const rows = await db.documentCategory.findMany({
    where: { knowledgeBaseId: kb.id },
    orderBy: [{ name: "asc" }],
  });

  return rows.map(mapCategory);
}

export async function createCategory(
  name: string,
  knowledgeBaseId?: string,
): Promise<CategoryRecord> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("类目名称不能为空");
  }

  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const kb = knowledgeBaseId
    ? await db.knowledgeBase.findUnique({ where: { id: knowledgeBaseId } })
    : await ensureDefaultKnowledgeBase();
  if (!kb) {
    throw new Error("知识库不存在");
  }
  await ensureDefaultCategory(kb.id);

  const existing = await db.documentCategory.findUnique({
    where: {
      knowledgeBaseId_name: {
        knowledgeBaseId: kb.id,
        name: trimmed,
      },
    },
  });

  if (existing) {
    return mapCategory(existing);
  }

  const created = await db.documentCategory.create({
    data: {
      knowledgeBaseId: kb.id,
      name: trimmed,
    },
  });

  return mapCategory(created);
}

export async function ensureCategoryExists(name: string) {
  return createCategory(name.trim() || DEFAULT_CATEGORY_NAME);
}
