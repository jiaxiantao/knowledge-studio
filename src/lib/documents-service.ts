import { unlink, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { Document, DocumentFormat, KnowledgeBase } from "@prisma/client";

import {
  deriveChunkTitle,
  estimateTokens,
  splitTextByConfig,
} from "@/lib/chunking";
import { parseChunkConfig } from "@/lib/chunk-config";
import { publishDocumentProgress } from "@/lib/document-progress-events";
import {
  CHUNK_CONTENT_MAX,
  CHUNK_TITLE_MAX,
  type ChunkRecord,
} from "@/lib/chunk-types";
import { getReadyDb } from "@/lib/db";
import { extractTextFromFile } from "@/lib/document-ingest";
import { embedText, toPgVectorLiteral } from "@/lib/embeddings";
import { prepareTextForChunking } from "@/lib/text-normalize";
import { getUploadDir } from "@/lib/rag-config";
import { isDocumentIngestStuck } from "@/lib/document-status";
import {
  ABSOLUTE_MAX_UPLOAD_BYTES,
  formatBytesLabel,
  validateUploadBasics,
} from "@/lib/upload-rules";

export type { ChunkRecord } from "@/lib/chunk-types";
export { CHUNK_CONTENT_MAX, CHUNK_TITLE_MAX } from "@/lib/chunk-types";
export { isDocumentIngestStuck } from "@/lib/document-status";

const ingestInFlight = new Set<string>();

export type DocumentRecord = {
  id: string;
  knowledgeBaseId: string;
  name: string;
  format: DocumentFormat;
  sizeBytes: number;
  status: Document["status"];
  progress: number;
  category: string;
  errorMessage: string | null;
  storageKey: string;
  createdAt: string;
  updatedAt: string;
  indexedAt: string | null;
  chunkCount?: number;
};

function mapDocument(
  doc: Document & { _count?: { chunks: number } },
): DocumentRecord {
  return {
    id: doc.id,
    knowledgeBaseId: doc.knowledgeBaseId,
    name: doc.name,
    format: doc.format,
    sizeBytes: doc.sizeBytes,
    status: doc.status,
    progress: doc.progress ?? 0,
    category: doc.category,
    errorMessage: doc.errorMessage,
    storageKey: doc.storageKey,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    indexedAt: doc.indexedAt?.toISOString() ?? null,
    chunkCount: doc._count?.chunks,
  };
}

export async function ensureDefaultKnowledgeBase(): Promise<KnowledgeBase> {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const existing = await db.knowledgeBase.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    return existing;
  }

  return db.knowledgeBase.create({
    data: {
      name: "我的知识库",
      description: "本地轻量 RAG 知识库",
    },
  });
}

export async function listDocuments(knowledgeBaseId?: string) {
  const db = await getReadyDb();
  if (!db) {
    return [] as DocumentRecord[];
  }

  const docs = await db.document.findMany({
    where: knowledgeBaseId ? { knowledgeBaseId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });

  return docs.map(mapDocument);
}

export function formatMaxUploadSize() {
  return formatBytesLabel(ABSOLUTE_MAX_UPLOAD_BYTES);
}

export async function getDocument(id: string) {
  const db = await getReadyDb();
  if (!db) {
    return null;
  }

  const doc = await db.document.findUnique({
    where: { id },
    include: { _count: { select: { chunks: true } } },
  });

  return doc ? mapDocument(doc) : null;
}

export async function getDocumentFile(id: string) {
  const document = await getDocument(id);
  if (!document) {
    return null;
  }

  const absolutePath = path.join(getUploadDir(), document.storageKey);
  return { document, absolutePath };
}

function mapChunk(chunk: {
  id: string;
  documentId: string;
  index: number;
  title: string | null;
  content: string;
  tokenEstimate: number;
  enabled: boolean;
  createdAt: Date;
}): ChunkRecord {
  return {
    id: chunk.id,
    documentId: chunk.documentId,
    index: chunk.index,
    title: chunk.title?.trim() || deriveChunkTitle(chunk.content),
    content: chunk.content,
    tokenEstimate: chunk.tokenEstimate,
    enabled: chunk.enabled,
    createdAt: chunk.createdAt.toISOString(),
  };
}

function normalizeChunkTitle(title: string | undefined, content: string) {
  const trimmed = (title ?? "").trim();
  if (trimmed) {
    return trimmed.slice(0, CHUNK_TITLE_MAX);
  }
  return deriveChunkTitle(content, CHUNK_TITLE_MAX) || null;
}

function normalizeChunkContent(content: string) {
  const trimmed = content.replace(/\r\n/g, "\n").trim();
  if (!trimmed) {
    throw new Error("切片内容不能为空");
  }
  if (trimmed.length > CHUNK_CONTENT_MAX) {
    throw new Error(`切片内容不能超过 ${CHUNK_CONTENT_MAX} 字`);
  }
  return trimmed;
}

async function writeChunkEmbedding(chunkId: string, content: string) {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const embedding = await embedText(content);
  const vector = toPgVectorLiteral(embedding);
  await db.$executeRawUnsafe(
    `UPDATE "Chunk" SET embedding = $1::vector WHERE id = $2`,
    vector,
    chunkId,
  );
}

async function clearChunkEmbedding(chunkId: string) {
  const db = await getReadyDb();
  if (!db) {
    return;
  }

  await db.$executeRawUnsafe(
    `UPDATE "Chunk" SET embedding = NULL WHERE id = $1`,
    chunkId,
  );
}

async function reindexDocumentChunks(documentId: string) {
  const db = await getReadyDb();
  if (!db) {
    return;
  }

  const chunks = await db.chunk.findMany({
    where: { documentId },
    orderBy: { index: "asc" },
    select: { id: true },
  });

  for (let i = 0; i < chunks.length; i += 1) {
    await db.chunk.update({
      where: { id: chunks[i].id },
      data: { index: -(i + 1) },
    });
  }

  for (let i = 0; i < chunks.length; i += 1) {
    await db.chunk.update({
      where: { id: chunks[i].id },
      data: { index: i },
    });
  }
}

export async function listDocumentChunks(documentId: string) {
  const db = await getReadyDb();
  if (!db) {
    return [] as ChunkRecord[];
  }

  const chunks = await db.chunk.findMany({
    where: { documentId },
    orderBy: { index: "asc" },
    select: {
      id: true,
      documentId: true,
      index: true,
      title: true,
      content: true,
      tokenEstimate: true,
      enabled: true,
      createdAt: true,
    },
  });

  return chunks.map(mapChunk);
}

export async function getDocumentChunk(chunkId: string) {
  const db = await getReadyDb();
  if (!db) {
    return null;
  }

  const chunk = await db.chunk.findUnique({
    where: { id: chunkId },
    select: {
      id: true,
      documentId: true,
      index: true,
      title: true,
      content: true,
      tokenEstimate: true,
      enabled: true,
      createdAt: true,
    },
  });

  return chunk ? mapChunk(chunk) : null;
}

export async function createDocumentChunk(
  documentId: string,
  input: { title?: string; content: string; enabled?: boolean },
) {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document) {
    throw new Error("Document not found");
  }

  const content = normalizeChunkContent(input.content);
  const title = normalizeChunkTitle(input.title, content);
  const enabled = input.enabled ?? true;

  const aggregate = await db.chunk.aggregate({
    where: { documentId },
    _max: { index: true },
  });
  const nextIndex = (aggregate._max.index ?? -1) + 1;

  const created = await db.chunk.create({
    data: {
      documentId,
      index: nextIndex,
      title,
      content,
      tokenEstimate: estimateTokens(content),
      enabled,
    },
  });

  if (enabled) {
    await writeChunkEmbedding(created.id, content);
  }

  const mapped = mapChunk(created);
  return mapped;
}

export async function updateDocumentChunk(
  chunkId: string,
  input: { title?: string; content?: string; enabled?: boolean },
) {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const existing = await db.chunk.findUnique({ where: { id: chunkId } });
  if (!existing) {
    throw new Error("Chunk not found");
  }

  const content =
    input.content !== undefined
      ? normalizeChunkContent(input.content)
      : existing.content;
  const title =
    input.title !== undefined
      ? normalizeChunkTitle(input.title, content)
      : existing.title ?? normalizeChunkTitle(undefined, content);
  const enabled = input.enabled ?? existing.enabled;
  const contentChanged = content !== existing.content;

  const updated = await db.chunk.update({
    where: { id: chunkId },
    data: {
      title,
      content,
      tokenEstimate: estimateTokens(content),
      enabled,
    },
  });

  if (!enabled) {
    await clearChunkEmbedding(chunkId);
  } else if (contentChanged || !existing.enabled) {
    await writeChunkEmbedding(chunkId, content);
  }

  return mapChunk(updated);
}

export async function deleteDocumentChunk(chunkId: string) {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const existing = await db.chunk.findUnique({ where: { id: chunkId } });
  if (!existing) {
    throw new Error("Chunk not found");
  }

  await db.chunk.delete({ where: { id: chunkId } });
  await reindexDocumentChunks(existing.documentId);

  return { success: true as const, documentId: existing.documentId };
}

async function saveUploadFile(
  file: File,
  format: DocumentFormat,
): Promise<{ absolutePath: string; storageKey: string; sizeBytes: number }> {
  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });

  const ext =
    format === "md"
      ? "md"
      : format === "jpeg"
        ? "jpg"
        : String(format);
  const storageKey = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const absolutePath = path.join(uploadDir, storageKey);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(absolutePath, buffer);

  return { absolutePath, storageKey, sizeBytes: buffer.byteLength };
}

export async function createUploadedDocument(
  file: File,
  category = "默认类目",
  knowledgeBaseId?: string,
  chunkConfigRaw?: unknown,
) {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const basics = validateUploadBasics(file.name, file.size);
  if (!basics.ok) {
    throw new Error(basics.error);
  }
  const format = basics.format as DocumentFormat;

  // Image dimension check before persisting.
  if (["png", "jpg", "jpeg", "bmp", "gif", "webp"].includes(format)) {
    const { imageSize } = await import("image-size");
    const { validateImageDimensions } = await import("@/lib/upload-rules");
    const buffer = Buffer.from(await file.arrayBuffer());
    const dim = imageSize(buffer);
    if (!dim.width || !dim.height) {
      throw new Error("无法读取图片尺寸");
    }
    const dimError = validateImageDimensions(dim.width, dim.height);
    if (dimError) {
      throw new Error(dimError);
    }
  }

  const kb = knowledgeBaseId
    ? await db.knowledgeBase.findUnique({ where: { id: knowledgeBaseId } })
    : await ensureDefaultKnowledgeBase();
  if (!kb) {
    throw new Error("知识库不存在");
  }
  const saved = await saveUploadFile(file, format);
  const categoryName = category.trim() || "默认类目";

  await db.documentCategory.upsert({
    where: {
      knowledgeBaseId_name: {
        knowledgeBaseId: kb.id,
        name: categoryName,
      },
    },
    create: {
      knowledgeBaseId: kb.id,
      name: categoryName,
    },
    update: {},
  });

  const chunkConfig = parseChunkConfig(chunkConfigRaw);

  const document = await db.document.create({
    data: {
      knowledgeBaseId: kb.id,
      name: file.name,
      format,
      sizeBytes: saved.sizeBytes,
      status: "pending",
      progress: 5,
      category: categoryName,
      chunkConfig: chunkConfig as object,
      storageKey: saved.storageKey,
    },
    include: { _count: { select: { chunks: true } } },
  });

  const mapped = mapDocument(document);
  publishDocumentProgress(mapped);
  return mapped;
}

async function setDocumentProgress(
  id: string,
  data: {
    status?: Document["status"];
    progress?: number;
    errorMessage?: string | null;
    indexedAt?: Date | null;
  },
) {
  const db = await getReadyDb();
  if (!db) {
    return null;
  }

  const updated = await db.document.update({
    where: { id },
    data,
    include: { _count: { select: { chunks: true } } },
  });

  if (updated) {
    publishDocumentProgress(mapDocument(updated));
  }

  return updated;
}

export async function processDocumentIngest(documentId: string) {
  if (ingestInFlight.has(documentId)) {
    return null;
  }

  ingestInFlight.add(documentId);

  const db = await getReadyDb();
  if (!db) {
    ingestInFlight.delete(documentId);
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document) {
    ingestInFlight.delete(documentId);
    throw new Error("Document not found");
  }

  const absolutePath = path.join(getUploadDir(), document.storageKey);

  try {
    await setDocumentProgress(documentId, {
      status: "parsing",
      progress: 12,
      errorMessage: null,
    });

    const text = await extractTextFromFile(absolutePath, document.format, {
      onProgress: async ({ phase, ratio }) => {
        // Keep OCR in the early progress band before chunking/embedding.
        const progress =
          phase === "ocr"
            ? Math.min(28, Math.round(12 + ratio * 16))
            : Math.min(18, Math.round(12 + ratio * 6));
        await setDocumentProgress(documentId, { progress });
      },
    });
    if (!text) {
      throw new Error(
        document.format === "pdf"
          ? "未能从 PDF 提取到文字内容。该文件可能是扫描件/图片型 PDF。"
          : "未能从文件中提取到文本内容",
      );
    }

    await setDocumentProgress(documentId, { progress: 30 });

    const prepared = prepareTextForChunking(text, document.format);
    if (!prepared) {
      throw new Error("清洗后的文本为空，请检查原文件是否为可解析的文字版 PDF");
    }

    const chunkConfig = parseChunkConfig(document.chunkConfig);
    const pieces = splitTextByConfig(prepared, chunkConfig);
    if (!pieces.length) {
      throw new Error("切片结果为空");
    }

    await db.chunk.deleteMany({ where: { documentId } });
    await setDocumentProgress(documentId, { progress: 30 });

    for (let index = 0; index < pieces.length; index += 1) {
      const piece = pieces[index];
      const created = await db.chunk.create({
        data: {
          documentId,
          index: piece.index,
          title: deriveChunkTitle(piece.content, CHUNK_TITLE_MAX) || null,
          content: piece.content,
          tokenEstimate: piece.tokenEstimate,
          enabled: true,
        },
      });

      const embedding = await embedText(piece.content);
      const vector = toPgVectorLiteral(embedding);
      await db.$executeRawUnsafe(
        `UPDATE "Chunk" SET embedding = $1::vector WHERE id = $2`,
        vector,
        created.id,
      );

      const ratio = (index + 1) / pieces.length;
      const progress = Math.min(96, Math.round(30 + ratio * 66));
      await setDocumentProgress(documentId, { progress });
    }

    const ready = await setDocumentProgress(documentId, {
      status: "ready",
      progress: 100,
      indexedAt: new Date(),
      errorMessage: null,
    });

    return ready ? mapDocument(ready) : null;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "文档解析或向量化失败";

    const failed = await setDocumentProgress(documentId, {
      status: "failed",
      progress: 100,
      errorMessage: message,
    });

    return failed ? mapDocument(failed) : null;
  } finally {
    ingestInFlight.delete(documentId);
  }
}

/** Reset status and allow background re-ingest. */
export async function queueDocumentReprocess(
  documentId: string,
  options: { force?: boolean } = {},
) {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const existing = await db.document.findUnique({
    where: { id: documentId },
    include: { _count: { select: { chunks: true } } },
  });

  if (!existing) {
    throw new Error("Document not found");
  }

  const stuck = isDocumentIngestStuck(existing);
  if (
    (existing.status === "pending" || existing.status === "parsing") &&
    !options.force &&
    !stuck
  ) {
    return mapDocument(existing);
  }

  const updated = await setDocumentProgress(documentId, {
    status: "pending",
    progress: 5,
    errorMessage: null,
    indexedAt: null,
  });

  return updated ? mapDocument(updated) : mapDocument(existing);
}

/** @deprecated Prefer createUploadedDocument + processDocumentIngest */
export async function ingestUploadedFile(file: File, category = "默认类目") {
  const created = await createUploadedDocument(file, category);
  const processed = await processDocumentIngest(created.id);
  return processed ?? created;
}

export async function deleteDocument(id: string) {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const existing = await db.document.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Document not found");
  }

  await db.document.delete({ where: { id } });

  const absolutePath = path.join(getUploadDir(), existing.storageKey);
  await unlink(absolutePath).catch(() => undefined);

  return { success: true };
}

export async function deleteDocuments(ids: string[]) {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  let deleted = 0;
  const failed: Array<{ id: string; error: string }> = [];

  for (const id of uniqueIds) {
    try {
      await deleteDocument(id);
      deleted += 1;
    } catch (error) {
      failed.push({
        id,
        error: error instanceof Error ? error.message : "删除失败",
      });
    }
  }

  return { deleted, failed };
}
