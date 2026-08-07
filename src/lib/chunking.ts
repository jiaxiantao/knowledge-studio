import {
  childMaxCharsFor,
  type ChunkConfig,
} from "@/lib/chunk-config";

export type ChunkLevel = "leaf" | "parent" | "child";

export type TextChunk = {
  index: number;
  content: string;
  tokenEstimate: number;
  level: ChunkLevel;
  /** Temporary link to parent chunk index within the same split result. */
  parentIndex?: number;
  title?: string;
};

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 1.5));
}

export function deriveChunkTitle(content: string, maxLength = 50) {
  const line =
    content
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((part) =>
        part.replace(/^#+\s*/, "").replace(/^【目录】\s*/, "").trim(),
      )
      .find(Boolean) ?? "";

  if (!line) {
    return "";
  }

  return line.length > maxLength ? `${line.slice(0, maxLength - 1)}…` : line;
}

const DEFAULT_SEPARATORS = [
  "\n## ",
  "\n### ",
  "\n#### ",
  "\n# ",
  "\n\n",
  "\n",
  "。",
  "！",
  "？",
  "；",
  ". ",
  "! ",
  "? ",
  " ",
  "",
];

const TITLE_FIRST_SEPARATORS = [
  "\n## ",
  "\n### ",
  "\n#### ",
  "\n# ",
  "\n\n",
  "\n",
  "。",
  " ",
  "",
];

function toChunk(
  content: string,
  index: number,
  level: ChunkLevel,
  parentIndex?: number,
): TextChunk {
  const trimmed = content.trim();
  return {
    index,
    content: trimmed,
    tokenEstimate: estimateTokens(trimmed),
    level,
    parentIndex,
    title: deriveChunkTitle(trimmed) || undefined,
  };
}

function splitKeepSeparator(text: string, separator: string): string[] {
  if (!separator) {
    const chars = Array.from(text);
    return chars.length ? chars : [text];
  }

  if (!text.includes(separator)) {
    return [text];
  }

  const parts = text.split(separator);
  const out: string[] = [];
  parts.forEach((part, index) => {
    if (index === 0) {
      if (part) {
        out.push(part);
      }
      return;
    }
    out.push(`${separator}${part}`);
  });

  return out.map((part) => part.trim()).filter(Boolean);
}

function slidingWindows(text: string, maxChars: number, overlap: number) {
  const normalized = text.trim();
  if (!normalized) {
    return [] as string[];
  }
  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const step = Math.max(1, maxChars - overlap);
  const windows: string[] = [];
  for (let start = 0; start < normalized.length; start += step) {
    const slice = normalized.slice(start, start + maxChars).trim();
    if (slice) {
      windows.push(slice);
    }
    if (start + maxChars >= normalized.length) {
      break;
    }
  }
  return windows;
}

/**
 * LangChain-style recursive character splitter with real inter-chunk overlap.
 */
function recursiveSplit(
  text: string,
  maxChars: number,
  overlap: number,
  separators: string[],
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }
  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const [separator = "", ...rest] = separators;
  const splits =
    separator === ""
      ? slidingWindows(normalized, maxChars, overlap)
      : splitKeepSeparator(normalized, separator);

  if (splits.length <= 1 && rest.length > 0) {
    return recursiveSplit(normalized, maxChars, overlap, rest);
  }
  if (splits.length <= 1) {
    return slidingWindows(normalized, maxChars, overlap);
  }

  // Recurse into oversized pieces with remaining separators.
  const refined: string[] = [];
  for (const piece of splits) {
    if (piece.length <= maxChars) {
      refined.push(piece);
    } else if (rest.length > 0) {
      refined.push(...recursiveSplit(piece, maxChars, overlap, rest));
    } else {
      refined.push(...slidingWindows(piece, maxChars, overlap));
    }
  }

  // Merge small pieces into ≤ maxChars windows; carry overlap into next window.
  const merged: string[] = [];
  let current = "";

  const pushCurrent = () => {
    const value = current.trim();
    if (!value) {
      current = "";
      return;
    }
    merged.push(value);
    if (overlap > 0 && value.length > overlap) {
      current = value.slice(Math.max(0, value.length - overlap));
    } else {
      current = "";
    }
  };

  for (const piece of refined) {
    const part = piece.trim();
    if (!part) {
      continue;
    }

    if (!current) {
      current = part;
      if (current.length >= maxChars) {
        if (current.length > maxChars) {
          const windows = slidingWindows(current, maxChars, overlap);
          merged.push(...windows.slice(0, -1));
          current = windows[windows.length - 1] ?? "";
          if (current.length > maxChars) {
            pushCurrent();
          }
        } else {
          pushCurrent();
        }
      }
      continue;
    }

    const joiner = current.endsWith("\n") || part.startsWith("\n") ? "" : "\n";
    const candidate = `${current}${joiner}${part}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    pushCurrent();
    // After overlap tail, append the new part.
    if (!current) {
      current = part;
    } else {
      const joiner2 = current.endsWith("\n") || part.startsWith("\n") ? "" : "\n";
      current = `${current}${joiner2}${part}`;
    }

    if (current.length > maxChars) {
      const windows = slidingWindows(current, maxChars, overlap);
      merged.push(...windows.slice(0, -1));
      current = windows[windows.length - 1] ?? "";
      if (current.length >= maxChars) {
        pushCurrent();
      }
    }
  }

  const last = current.trim();
  if (last) {
    const prev = merged[merged.length - 1];
    if (prev !== last) {
      merged.push(last);
    }
  }

  return merged;
}

function splitByPageBlocks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const byMarker = normalized
    .split(/(?=【第\s*\d+\s*页】)/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (byMarker.length > 1) {
    return byMarker;
  }

  return [normalized];
}

function decodeSymbolPattern(symbol?: string) {
  if (!symbol?.trim()) {
    return "\n\n";
  }
  return symbol.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

function strategySeparators(config: ChunkConfig): string[] {
  switch (config.strategy) {
    case "title":
      return TITLE_FIRST_SEPARATORS;
    case "page":
      return ["\n\n", "\n", "。", " ", ""];
    case "symbol":
      return [decodeSymbolPattern(config.symbol), "\n\n", "\n", "。", " ", ""];
    case "length":
      return [""];
    case "regex":
    case "smart":
    default:
      return DEFAULT_SEPARATORS;
  }
}

function initialBlocks(text: string, config: ChunkConfig): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  if (config.strategy === "page") {
    return splitByPageBlocks(normalized);
  }

  if (config.strategy === "regex" && config.regex?.trim()) {
    try {
      const parts = normalized
        .split(new RegExp(config.regex, "gm"))
        .map((part) => part.trim())
        .filter(Boolean);
      return parts.length ? parts : [normalized];
    } catch {
      return [normalized];
    }
  }

  if (config.strategy === "symbol") {
    const sep = decodeSymbolPattern(config.symbol);
    const parts = normalized
      .split(sep)
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length ? parts : [normalized];
  }

  if (config.strategy === "title") {
    const titleSplit =
      /(?=^#{1,6}\s|^(?:第[一二三四五六七八九十百千\d]+[章节篇部])|^\d+(?:\.\d+)+\s+)/m;
    const sections = normalized
      .split(titleSplit)
      .map((part) => part.trim())
      .filter(Boolean);
    return sections.length ? sections : [normalized];
  }

  return [normalized];
}

export function splitTextByConfig(text: string, config: ChunkConfig): TextChunk[] {
  const maxChars = config.maxChars;
  const overlap = Math.min(config.overlap, Math.floor(maxChars / 2));
  const separators = strategySeparators(config);
  const blocks = initialBlocks(text, config);
  if (!blocks.length) {
    return [];
  }

  const parentWindows: string[] = [];
  if (config.strategy === "length") {
    parentWindows.push(
      ...slidingWindows(text.replace(/\r\n/g, "\n").trim(), maxChars, overlap),
    );
  } else {
    for (const block of blocks) {
      parentWindows.push(
        ...recursiveSplit(block, maxChars, overlap, separators),
      );
    }
  }

  if (!parentWindows.length) {
    return [];
  }

  if (!config.parentChild) {
    return parentWindows.map((content, index) =>
      toChunk(content, index, "leaf"),
    );
  }

  const childMax = childMaxCharsFor(maxChars);
  const childOverlap = Math.min(
    overlap,
    Math.max(16, Math.floor(childMax * 0.1)),
  );
  const result: TextChunk[] = [];
  let nextIndex = 0;

  for (const parentContent of parentWindows) {
    const parentIndex = nextIndex;
    result.push(toChunk(parentContent, parentIndex, "parent"));
    nextIndex += 1;

    const children =
      parentContent.length <= childMax
        ? [parentContent]
        : recursiveSplit(parentContent, childMax, childOverlap, separators);

    for (const childContent of children) {
      result.push(toChunk(childContent, nextIndex, "child", parentIndex));
      nextIndex += 1;
    }
  }

  return result;
}

export function splitIntoChunks(
  text: string,
  options: { maxChars?: number; overlap?: number } = {},
): TextChunk[] {
  return splitTextByConfig(text, {
    strategy: "smart",
    maxChars: options.maxChars ?? 800,
    overlap: options.overlap ?? 80,
    parentChild: false,
  });
}
