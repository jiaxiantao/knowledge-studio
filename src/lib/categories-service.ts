import { ensureDefaultKnowledgeBase } from "@/lib/documents-service";
import { getReadyDb } from "@/lib/db";
import { assertCategoryOwned, assertKnowledgeBaseOwned } from "@/lib/ownership";

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

export async function ensureDefaultCategory(
  userId: string,
  knowledgeBaseId?: string,
) {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const kbId =
    knowledgeBaseId ?? (await ensureDefaultKnowledgeBase(userId)).id;
  await assertKnowledgeBaseOwned(kbId, userId);

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
  userId: string,
  knowledgeBaseId?: string,
): Promise<CategoryRecord[]> {
  const db = await getReadyDb();
  if (!db) {
    return [];
  }

  const kb = knowledgeBaseId
    ? await assertKnowledgeBaseOwned(knowledgeBaseId, userId)
    : await ensureDefaultKnowledgeBase(userId);

  await ensureDefaultCategory(userId, kb.id);

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
  userId: string,
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
    ? await assertKnowledgeBaseOwned(knowledgeBaseId, userId)
    : await ensureDefaultKnowledgeBase(userId);
  await ensureDefaultCategory(userId, kb.id);

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

export async function ensureCategoryExists(userId: string, name: string) {
  return createCategory(userId, name.trim() || DEFAULT_CATEGORY_NAME);
}

export async function renameCategory(
  userId: string,
  id: string,
  newName: string,
): Promise<CategoryRecord> {
  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error("类目名称不能为空");
  }
  if (trimmed.length > 64) {
    throw new Error("类目名称不能超过 64 个字符");
  }

  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const existing = await assertCategoryOwned(id, userId);
  if (existing.name === DEFAULT_CATEGORY_NAME) {
    throw new Error("默认类目不可修改");
  }
  if (trimmed === existing.name) {
    return mapCategory(existing);
  }
  if (trimmed === DEFAULT_CATEGORY_NAME) {
    throw new Error("不能改名为默认类目");
  }

  const conflict = await db.documentCategory.findUnique({
    where: {
      knowledgeBaseId_name: {
        knowledgeBaseId: existing.knowledgeBaseId,
        name: trimmed,
      },
    },
  });
  if (conflict) {
    throw new Error("同类目名称已存在");
  }

  const [, updated] = await db.$transaction([
    db.document.updateMany({
      where: {
        knowledgeBaseId: existing.knowledgeBaseId,
        category: existing.name,
      },
      data: { category: trimmed },
    }),
    db.documentCategory.update({
      where: { id },
      data: { name: trimmed },
    }),
  ]);

  return mapCategory(updated);
}

export async function deleteCategory(
  userId: string,
  id: string,
): Promise<{ success: true }> {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const existing = await assertCategoryOwned(id, userId);
  if (existing.name === DEFAULT_CATEGORY_NAME) {
    throw new Error("默认类目不可删除");
  }

  await ensureDefaultCategory(userId, existing.knowledgeBaseId);

  await db.$transaction([
    db.document.updateMany({
      where: {
        knowledgeBaseId: existing.knowledgeBaseId,
        category: existing.name,
      },
      data: { category: DEFAULT_CATEGORY_NAME },
    }),
    db.documentCategory.delete({ where: { id } }),
  ]);

  return { success: true };
}
