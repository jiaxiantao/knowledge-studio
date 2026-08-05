import { mkdirSync } from "node:fs";
import path from "node:path";

export function getUploadDir() {
  const dir = process.env.UPLOAD_DIR?.trim() || "data/uploads";
  const absolute = path.isAbsolute(dir)
    ? dir
    : path.join(/* turbopackIgnore: true */ process.cwd(), dir);
  mkdirSync(absolute, { recursive: true });
  return absolute;
}

export function getEmbedModel() {
  return process.env.OLLAMA_EMBED_MODEL?.trim() || "nomic-embed-text";
}

export function getOllamaBaseUrl() {
  // OpenAI-compatible base ends with /v1; native Ollama API is without /v1
  const raw =
    process.env.OLLAMA_NATIVE_BASE_URL?.trim() ||
    process.env.OLLAMA_BASE_URL?.replace(/\/v1\/?$/, "") ||
    "http://127.0.0.1:11434";
  return raw.replace(/\/$/, "");
}

export const EMBEDDING_DIMENSIONS = 768;

/** Drop weak vector hits so unrelated docs don't force a "KB miss" refusal. */
export function getMinRetrievalScore() {
  const raw = Number(process.env.RAG_MIN_SCORE ?? "0.42");
  if (!Number.isFinite(raw)) {
    return 0.42;
  }
  return Math.min(Math.max(raw, 0), 1);
}

const DEFAULT_MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export function getMaxUploadBytes() {
  const raw = Number(
    process.env.MAX_UPLOAD_BYTES ?? String(DEFAULT_MAX_UPLOAD_BYTES),
  );
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }
  return raw;
}

/** Treat long-running pending/parsing as stuck (default 15 min). */
export function getIngestStuckMs() {
  const minutes = Number(process.env.INGEST_STUCK_MINUTES ?? "15");
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return 15 * 60 * 1000;
  }
  return minutes * 60 * 1000;
}
