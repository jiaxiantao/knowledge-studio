import { createHash, randomBytes } from "node:crypto";

import { getReadyDb } from "@/lib/db";

export type ApiKeyRecord = {
  id: string;
  description: string;
  keyPrefix: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

export type ApiKeyCreated = ApiKeyRecord & {
  /** Plaintext secret — only returned on create/reset. */
  secret: string;
};

function hashApiKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function maskSecret(secret: string): string {
  if (secret.length <= 16) {
    return `${secret.slice(0, 8)}****`;
  }
  return `${secret.slice(0, 12)}****${secret.slice(-4)}`;
}

function generateSecret(): string {
  const body = randomBytes(24).toString("base64url");
  return `sk-ks-${body}`;
}

function mapRow(row: {
  id: string;
  description: string;
  keyPrefix: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
}): ApiKeyRecord {
  return {
    id: row.id,
    description: row.description,
    keyPrefix: row.keyPrefix,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  };
}

export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const db = await getReadyDb();
  if (!db) {
    return [];
  }

  const rows = await db.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapRow);
}

export async function createApiKey(
  userId: string,
  description = "",
): Promise<ApiKeyCreated> {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("数据库不可用");
  }

  const secret = generateSecret();
  const row = await db.apiKey.create({
    data: {
      userId,
      description: description.trim().slice(0, 200),
      keyPrefix: maskSecret(secret),
      keyHash: hashApiKey(secret),
      enabled: true,
    },
  });

  return { ...mapRow(row), secret };
}

export async function updateApiKey(
  userId: string,
  id: string,
  input: { description?: string; enabled?: boolean },
): Promise<ApiKeyRecord | null> {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("数据库不可用");
  }

  const existing = await db.apiKey.findFirst({ where: { id, userId } });
  if (!existing) {
    return null;
  }

  const row = await db.apiKey.update({
    where: { id },
    data: {
      ...(input.description !== undefined
        ? { description: input.description.trim().slice(0, 200) }
        : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    },
  });

  return mapRow(row);
}

export async function resetApiKey(
  userId: string,
  id: string,
): Promise<ApiKeyCreated | null> {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("数据库不可用");
  }

  const existing = await db.apiKey.findFirst({ where: { id, userId } });
  if (!existing) {
    return null;
  }

  const secret = generateSecret();
  const row = await db.apiKey.update({
    where: { id },
    data: {
      keyPrefix: maskSecret(secret),
      keyHash: hashApiKey(secret),
    },
  });

  return { ...mapRow(row), secret };
}

export async function deleteApiKey(
  userId: string,
  id: string,
): Promise<boolean> {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("数据库不可用");
  }

  const result = await db.apiKey.deleteMany({ where: { id, userId } });
  return result.count > 0;
}

export async function findApiKeyBySecret(secret: string): Promise<{
  id: string;
  userId: string;
  enabled: boolean;
} | null> {
  const trimmed = secret.trim();
  if (!trimmed.startsWith("sk-ks-")) {
    return null;
  }

  const db = await getReadyDb();
  if (!db) {
    return null;
  }

  const row = await db.apiKey.findUnique({
    where: { keyHash: hashApiKey(trimmed) },
    select: { id: true, userId: true, enabled: true },
  });

  return row;
}

export async function touchApiKeyLastUsed(id: string): Promise<void> {
  const db = await getReadyDb();
  if (!db) {
    return;
  }

  await db.apiKey.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
}
