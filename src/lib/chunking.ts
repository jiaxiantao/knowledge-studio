import type { ChunkConfig } from "@/lib/chunk-config";

export type TextChunk = {
  index: number;
  content: string;
  tokenEstimate: number;
};

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 1.5));
}

/** First meaningful line as a short title (max 50). */
export function deriveChunkTitle(content: string, maxLength = 50) {
  const line =
    content
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((part) => part.replace(/^#+\s*/, "").replace(/^【目录】\s*/, "").trim())
      .find(Boolean) ?? "";

  if (!line) {
    return "";
  }

  return line.length > maxLength ? `${line.slice(0, maxLength - 1)}…` : line;
}

function toChunks(windows: string[]): TextChunk[] {
  return windows
    .filter(Boolean)
    .map((content, index) => ({
      index,
      content,
      tokenEstimate: estimateTokens(content),
    }));
}

function mergePartsToMaxChars(parts: string[], maxChars: number, overlap: number) {
  const windows: string[] = [];
  let buffer = "";

  const flush = () => {
    const value = buffer.trim();
    if (value) {
      windows.push(value);
    }
    buffer = "";
  };

  for (const part of parts) {
    const paragraph = part.trim();
    if (!paragraph) {
      continue;
    }

    if (paragraph.length > maxChars) {
      flush();
      for (let start = 0; start < paragraph.length; start += maxChars - overlap) {
        windows.push(paragraph.slice(start, start + maxChars).trim());
      }
      continue;
    }

    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars) {
      flush();
      buffer = paragraph;
    } else {
      buffer = candidate;
    }
  }

  flush();
  return windows;
}

/**
 * Smart split: paragraph merge up to maxChars with overlap on long paragraphs.
 */
export function splitIntoChunks(
  text: string,
  options: { maxChars?: number; overlap?: number } = {},
): TextChunk[] {
  const maxChars = options.maxChars ?? 600;
  const overlap = options.overlap ?? 64;
  const normalized = text.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  return toChunks(mergePartsToMaxChars(paragraphs, maxChars, overlap));
}

function splitByLength(text: string, config: ChunkConfig): TextChunk[] {
  const maxChars = config.maxChars;
  const overlap = config.overlap;
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const windows: string[] = [];
  for (let start = 0; start < normalized.length; start += maxChars - overlap) {
    const slice = normalized.slice(start, start + maxChars).trim();
    if (slice) {
      windows.push(slice);
    }
  }

  return toChunks(windows);
}

function splitByPage(text: string, config: ChunkConfig): TextChunk[] {
  const pages = text
    .split(/\n{2,}|(?=【第 \d+ 页】)/)
    .map((part) => part.trim())
    .filter(Boolean);

  const windows: string[] = [];
  for (const page of pages) {
    if (page.length <= config.maxChars) {
      windows.push(page);
      continue;
    }
    windows.push(
      ...mergePartsToMaxChars([page], config.maxChars, config.overlap),
    );
  }

  return toChunks(windows);
}

const TITLE_SPLIT =
  /(?=^#{1,6}\s|^(?:第[一二三四五六七八九十百千\d]+[章节篇部])|^\d+(?:\.\d+)+\s+)/m;

function splitByTitle(text: string, config: ChunkConfig): TextChunk[] {
  const sections = text
    .split(TITLE_SPLIT)
    .map((part) => part.trim())
    .filter(Boolean);

  return toChunks(
    mergePartsToMaxChars(sections, config.maxChars, config.overlap),
  );
}

function splitByRegex(text: string, config: ChunkConfig): TextChunk[] {
  const pattern = config.regex?.trim();
  if (!pattern) {
    return splitIntoChunks(text, config);
  }

  try {
    const parts = text
      .split(new RegExp(pattern, "gm"))
      .map((part) => part.trim())
      .filter(Boolean);
    return toChunks(
      mergePartsToMaxChars(parts, config.maxChars, config.overlap),
    );
  } catch {
    return splitIntoChunks(text, config);
  }
}

function decodeSymbolPattern(symbol?: string) {
  if (!symbol?.trim()) {
    return "\n\n";
  }
  return symbol.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

function splitBySymbol(text: string, config: ChunkConfig): TextChunk[] {
  const separator = decodeSymbolPattern(config.symbol);
  const parts = text
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean);

  return toChunks(
    mergePartsToMaxChars(parts, config.maxChars, config.overlap),
  );
}

export function splitTextByConfig(text: string, config: ChunkConfig): TextChunk[] {
  switch (config.strategy) {
    case "length":
      return splitByLength(text, config);
    case "page":
      return splitByPage(text, config);
    case "title":
      return splitByTitle(text, config);
    case "regex":
      return splitByRegex(text, config);
    case "symbol":
      return splitBySymbol(text, config);
    case "smart":
    default:
      return splitIntoChunks(text, {
        maxChars: config.maxChars,
        overlap: config.overlap,
      });
  }
}
