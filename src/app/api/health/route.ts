import { NextResponse } from "next/server";

import { getReadyDb, isDbMarkedUnavailable, probeDbConnection } from "@/lib/db";
import { getLlmLabel, isLlmConfigured } from "@/lib/llm-config";

async function isVectorExtensionEnabled() {
  const db = await getReadyDb();
  if (!db) {
    return false;
  }

  try {
    const rows = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') AS exists`,
    );
    return Boolean(rows[0]?.exists);
  } catch {
    return false;
  }
}

export async function GET() {
  const started = performance.now();

  const dbStarted = performance.now();
  const dbOk = await probeDbConnection(true);
  const dbMs = Math.round(performance.now() - dbStarted);
  const db = dbOk ? await getReadyDb() : null;
  const vector = db ? await isVectorExtensionEnabled() : false;

  const llmConfigured = isLlmConfigured();
  let llmLabel = "unconfigured";

  try {
    llmLabel = getLlmLabel();
  } catch {
    llmLabel = "misconfigured";
  }

  const totalMs = Math.round(performance.now() - started);

  return NextResponse.json({
    ok: dbOk,
    ready: dbOk && llmConfigured,
    db: {
      connected: Boolean(db) && !isDbMarkedUnavailable(),
      ok: dbOk,
      latencyMs: dbMs,
    },
    llm: { configured: llmConfigured, label: llmLabel },
    search: { vector },
    server: {
      node: process.version,
      totalMs,
    },
    timestamp: new Date().toISOString(),
  });
}
