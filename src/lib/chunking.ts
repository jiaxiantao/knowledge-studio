export type TextChunk = {
  index: number;
  content: string;
  tokenEstimate: number;
};

export function estimateTokens(text: string) {
  // Rough bilingual estimate: ~1.5 chars per token for mixed CN/EN.
  return Math.max(1, Math.ceil(text.length / 1.5));
}

/** First meaningful line as a short title (max 50). */
export function deriveChunkTitle(content: string, maxLength = 50) {
  const line =
    content
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((part) => part.replace(/^#+\s*/, "").trim())
      .find(Boolean) ?? "";

  if (!line) {
    return "";
  }

  return line.length > maxLength ? `${line.slice(0, maxLength - 1)}…` : line;
}

/**
 * Split text into overlapping windows (~500–800 chars, overlap ~80).
 */
export function splitIntoChunks(
  text: string,
  options: { maxChars?: number; overlap?: number } = {},
): TextChunk[] {
  const maxChars = options.maxChars ?? 700;
  const overlap = options.overlap ?? 80;
  const normalized = text.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const windows: string[] = [];
  let buffer = "";

  const flush = () => {
    const value = buffer.trim();
    if (value) {
      windows.push(value);
    }
    buffer = "";
  };

  for (const paragraph of paragraphs) {
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

  return windows
    .filter(Boolean)
    .map((content, index) => ({
      index,
      content,
      tokenEstimate: estimateTokens(content),
    }));
}
