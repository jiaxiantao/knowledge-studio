import { NextResponse } from "next/server";

import { getReadyDb, isDbMarkedUnavailable, probeDbConnection } from "@/lib/db";
import { getLlmLabel, isLlmConfigured } from "@/lib/llm-config";
import { isPgTrgmEnabled } from "@/lib/pg-trgm";

export async function GET() {
  const started = performance.now();
  let dbOk = false;
  let dbMs = 0;
  let pgTrgm = false;

  const dbStarted = performance.now();
  dbOk = await probeDbConnection(true);
  dbMs = Math.round(performance.now() - dbStarted);
  const db = dbOk ? await getReadyDb() : null;

  if (db) {
    pgTrgm = await isPgTrgmEnabled();
  }

  const llmConfigured = isLlmConfigured();
  let llmLabel = "unconfigured";

  try {
    llmLabel = getLlmLabel();
  } catch {
    llmLabel = "misconfigured";
  }

  const totalMs = Math.round(performance.now() - started);
  const ready = dbOk && llmConfigured;
  const ok = dbOk;

  return NextResponse.json({
    ok,
    ready,
    db: {
      connected: Boolean(db) && !isDbMarkedUnavailable(),
      ok: dbOk,
      latencyMs: dbMs,
    },
    llm: { configured: llmConfigured, label: llmLabel },
    search: { pgTrgm },
    server: {
      node: process.version,
      totalMs,
    },
    timestamp: new Date().toISOString(),
  });
}
