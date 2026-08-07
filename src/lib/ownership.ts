import { getReadyDb } from "@/lib/db";

export class KnowledgeBaseAccessError extends Error {
  status: number;

  constructor(message: string, status = 404) {
    super(message);
    this.name = "KnowledgeBaseAccessError";
    this.status = status;
  }
}

/** Returns the KB if it belongs to the user; otherwise null. */
export async function getOwnedKnowledgeBase(
  knowledgeBaseId: string,
  userId: string,
) {
  const db = await getReadyDb();
  if (!db) {
    return null;
  }

  return db.knowledgeBase.findFirst({
    where: { id: knowledgeBaseId, userId },
  });
}

export async function assertKnowledgeBaseOwned(
  knowledgeBaseId: string,
  userId: string,
) {
  const kb = await getOwnedKnowledgeBase(knowledgeBaseId, userId);
  if (!kb) {
    throw new KnowledgeBaseAccessError("知识库不存在", 404);
  }
  return kb;
}

/** Ensure every id belongs to the user; throws if any is missing. */
export async function assertKnowledgeBasesOwned(
  knowledgeBaseIds: string[],
  userId: string,
) {
  const unique = [...new Set(knowledgeBaseIds.filter(Boolean))];
  if (!unique.length) {
    throw new KnowledgeBaseAccessError("至少选择一个知识库", 400);
  }

  const db = await getReadyDb();
  if (!db) {
    throw new KnowledgeBaseAccessError("数据库不可用", 503);
  }

  const rows = await db.knowledgeBase.findMany({
    where: { id: { in: unique }, userId },
    select: { id: true },
  });

  if (rows.length !== unique.length) {
    throw new KnowledgeBaseAccessError("知识库不存在", 404);
  }

  return unique;
}

export async function assertDocumentOwned(documentId: string, userId: string) {
  const db = await getReadyDb();
  if (!db) {
    throw new KnowledgeBaseAccessError("数据库不可用", 503);
  }

  const doc = await db.document.findUnique({
    where: { id: documentId },
    include: { knowledgeBase: { select: { userId: true } } },
  });

  if (!doc || doc.knowledgeBase.userId !== userId) {
    throw new KnowledgeBaseAccessError("文档不存在", 404);
  }

  return doc;
}

export async function assertDocumentsOwned(
  documentIds: string[],
  userId: string,
) {
  const unique = [...new Set(documentIds.filter(Boolean))];
  if (!unique.length) {
    return [];
  }

  const db = await getReadyDb();
  if (!db) {
    throw new KnowledgeBaseAccessError("数据库不可用", 503);
  }

  const rows = await db.document.findMany({
    where: {
      id: { in: unique },
      knowledgeBase: { userId },
    },
    select: { id: true },
  });

  if (rows.length !== unique.length) {
    throw new KnowledgeBaseAccessError("文档不存在", 404);
  }

  return unique;
}

export async function assertCategoryOwned(categoryId: string, userId: string) {
  const db = await getReadyDb();
  if (!db) {
    throw new KnowledgeBaseAccessError("数据库不可用", 503);
  }

  const category = await db.documentCategory.findUnique({
    where: { id: categoryId },
    include: { knowledgeBase: { select: { userId: true } } },
  });

  if (!category || category.knowledgeBase.userId !== userId) {
    throw new KnowledgeBaseAccessError("类目不存在", 404);
  }

  return category;
}
