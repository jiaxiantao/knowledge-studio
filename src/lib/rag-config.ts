import { mkdirSync } from "node:fs";
import path from "node:path";

import { ABSOLUTE_MAX_UPLOAD_BYTES } from "@/lib/upload-rules";

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

const DEFAULT_MAX_UPLOAD_BYTES = ABSOLUTE_MAX_UPLOAD_BYTES;

export function getMaxUploadBytes() {
  const raw = Number(
    process.env.MAX_UPLOAD_BYTES ?? String(DEFAULT_MAX_UPLOAD_BYTES),
  );
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }
  return Math.min(raw, ABSOLUTE_MAX_UPLOAD_BYTES);
}

/** Treat long-running pending/parsing as stuck (default 15 min). */
export function getIngestStuckMs() {
  const minutes = Number(process.env.INGEST_STUCK_MINUTES ?? "15");
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return 15 * 60 * 1000;
  }
  return minutes * 60 * 1000;
}

/** Enable OCR fallback for scanned / image-only PDFs (default on). */
export function isPdfOcrEnabled() {
  const raw = process.env.PDF_OCR_ENABLED?.trim().toLowerCase();
  if (!raw) {
    return true;
  }
  return raw !== "0" && raw !== "false" && raw !== "off";
}

/** Tesseract languages, default Simplified Chinese. */
export function getOcrLangs() {
  const raw = process.env.PDF_OCR_LANGS?.trim();
  if (!raw) {
    return ["chi_sim"];
  }
  return raw
    .split(/[+,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Max pages to OCR per PDF (default 40). */
export function getOcrMaxPages() {
  const raw = Number(process.env.PDF_OCR_MAX_PAGES ?? "40");
  if (!Number.isFinite(raw) || raw <= 0) {
    return 40;
  }
  return Math.min(Math.floor(raw), 200);
}

/** Render scale for OCR (default 1.5). Higher = slower but clearer. */
export function getOcrScale() {
  const raw = Number(process.env.PDF_OCR_SCALE ?? "1.5");
  if (!Number.isFinite(raw) || raw <= 0) {
    return 1.5;
  }
  return Math.min(Math.max(raw, 1), 3);
}
