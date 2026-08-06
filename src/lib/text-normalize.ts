import type { DocumentFormat } from "@prisma/client";

const DOT_RUN = /[.·…．。‧\u2024\u2025\u2026]{4,}/g;
const TOC_LINE =
  /^(.{1,120}?)\s*[.·…．。‧\u2024\u2025\u2026]{2,}\s*(\d{1,4})\s*$/;
const MOSTLY_DOTS_LINE = /^[\s.·…．。‧\u2024\u2025\u2026\d]{6,}$/;

function cleanLine(line: string) {
  let cleaned = line.replace(/\t/g, " ").trim();
  if (!cleaned) {
    return "";
  }

  if (MOSTLY_DOTS_LINE.test(cleaned)) {
    return "";
  }

  const tocMatch = cleaned.match(TOC_LINE);
  if (tocMatch) {
    cleaned = `${tocMatch[1].trim()} · ${tocMatch[2]}`;
  } else {
    cleaned = cleaned.replace(DOT_RUN, " ");
  }

  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  return cleaned;
}

/** Remove PDF / OCR noise before chunking. */
export function normalizeExtractedText(text: string) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(cleanLine)
    .filter(Boolean);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function isTocLine(line: string) {
  return / · \d{1,4}$/.test(line);
}

function flushTocBlocks(tocLines: string[]) {
  const blocks: string[] = [];
  let batch: string[] = [];
  let length = 0;

  for (const line of tocLines) {
    if (length + line.length > 520 && batch.length) {
      blocks.push(`【目录】\n${batch.join("\n")}`);
      batch = [];
      length = 0;
    }
    batch.push(line);
    length += line.length;
  }

  if (batch.length) {
    blocks.push(`【目录】\n${batch.join("\n")}`);
  }

  return blocks;
}

/** Group PDF table-of-contents runs so they do not pollute body chunks. */
export function structurePdfText(text: string) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const blocks: string[] = [];
  let tocBuffer: string[] = [];

  const flushToc = () => {
    if (!tocBuffer.length) {
      return;
    }
    blocks.push(...flushTocBlocks(tocBuffer));
    tocBuffer = [];
  };

  for (const line of lines) {
    if (isTocLine(line)) {
      tocBuffer.push(line);
      continue;
    }

    flushToc();
    blocks.push(line);
  }

  flushToc();
  return blocks.join("\n\n").trim();
}

export function prepareTextForChunking(text: string, format: DocumentFormat) {
  const normalized = normalizeExtractedText(text);
  if (!normalized) {
    return "";
  }

  if (format === "pdf") {
    return structurePdfText(normalized);
  }

  return normalized;
}

/** True when page text looks like OCR/dot garbage rather than real body content. */
export function isLowQualityPageText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return true;
  }

  const compact = trimmed.replace(/\s+/g, "");
  if (compact.length < 50) {
    return true;
  }

  const dotChars = (trimmed.match(/[.·…．。‧\u2024\u2025\u2026]/g) ?? []).length;
  if (dotChars / trimmed.length > 0.12) {
    return true;
  }

  const uniqueRatio = new Set(compact).size / compact.length;
  if (uniqueRatio < 0.08 && compact.length > 100) {
    return true;
  }

  return false;
}

export function pickBetterPageText(textLayer: string, ocrText: string) {
  const layer = textLayer.trim();
  const ocr = ocrText.trim();
  if (!ocr) {
    return layer;
  }
  if (!layer || isLowQualityPageText(layer)) {
    return ocr;
  }
  if (isLowQualityPageText(ocr)) {
    return layer;
  }
  return ocr.length > layer.length * 1.15 ? ocr : layer;
}
