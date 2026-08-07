import { NextResponse } from "next/server";

import { getReadyDb, isDbMarkedUnavailable, probeDbConnection } from "@/lib/db";
import { getLlmLabel, isLlmConfigured } from "@/lib/llm-config";
import { getOllamaBaseUrl } from "@/lib/rag-config";

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

async function probeLlmReachable() {
  if (!isLlmConfigured()) {
    return { ok: false, detail: "unconfigured" as const };
  }

  const provider = (process.env.LLM_PROVIDER ?? "ollama").toLowerCase();
  if (provider !== "ollama") {
    return { ok: true, detail: "configured" as const };
  }

  const base = getOllamaBaseUrl();
  try {
    const response = await fetch(`${base}/api/tags`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) {
      return { ok: false, detail: `http_${response.status}` as const };
    }
    return { ok: true, detail: "reachable" as const };
  } catch {
    return { ok: false, detail: "unreachable" as const };
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

  const llmProbe = await probeLlmReachable();
  const totalMs = Math.round(performance.now() - started);

  return NextResponse.json({
    ok: dbOk,
    ready: dbOk && llmConfigured && llmProbe.ok,
    db: {
      connected: Boolean(db) && !isDbMarkedUnavailable(),
      ok: dbOk,
      latencyMs: dbMs,
    },
    llm: {
      configured: llmConfigured,
      label: llmLabel,
      reachable: llmProbe.ok,
      detail: llmProbe.detail,
    },
    search: { vector },
    server: {
      node: process.version,
      totalMs,
    },
    timestamp: new Date().toISOString(),
  });
}
