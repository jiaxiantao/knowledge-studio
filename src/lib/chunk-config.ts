import { z } from "zod";

export const CHUNK_STRATEGIES = [
  "smart",
  "length",
  "page",
  "title",
  "regex",
  "symbol",
] as const;

export type ChunkStrategy = (typeof CHUNK_STRATEGIES)[number];

export type ChunkConfig = {
  strategy: ChunkStrategy;
  /** Parent / leaf max size in characters (UI aligned with Bailian). */
  maxChars: number;
  overlap: number;
  /** When true, emit parent+child chunks (child for retrieval, parent for context). */
  parentChild: boolean;
  regex?: string;
  symbol?: string;
};

export const CHUNK_STRATEGY_LABELS: Record<
  ChunkStrategy,
  { title: string; description: string }
> = {
  smart: {
    title: "智能切分",
    description: "递归按标题→段落→句子切分（主流 Recursive），检索效果较好",
  },
  length: {
    title: "按长度切分",
    description: "固定长度滑动窗口，适合对长度有严格要求的场景",
  },
  page: {
    title: "按页切分",
    description: "先按页/分页标记切开，页内再递归切分",
  },
  title: {
    title: "按标题切分",
    description: "优先按章节/Markdown 标题切分，再递归填满分段长度",
  },
  regex: {
    title: "按正则切分",
    description: "使用自定义正则作为切分点，再递归合并",
  },
  symbol: {
    title: "按符号切分",
    description: "使用自定义分隔符切分，再递归合并",
  },
};

export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  strategy: "smart",
  maxChars: 800,
  overlap: 80,
  parentChild: true,
};

const chunkConfigSchema = z.object({
  strategy: z.enum(CHUNK_STRATEGIES).default("smart"),
  maxChars: z.number().int().min(10).max(6000).default(800),
  overlap: z.number().int().min(0).max(512).optional(),
  parentChild: z.boolean().optional(),
  regex: z.string().max(500).optional(),
  symbol: z.string().max(64).optional(),
});

export function overlapForMaxChars(maxChars: number) {
  return Math.min(128, Math.max(16, Math.floor(maxChars * 0.1)));
}

/** Child chunk size ≈ 40% of parent, floored for recall. */
export function childMaxCharsFor(maxChars: number) {
  return Math.min(maxChars, Math.max(180, Math.floor(maxChars * 0.4)));
}

export function parseChunkConfig(raw: unknown): ChunkConfig {
  if (!raw) {
    return { ...DEFAULT_CHUNK_CONFIG };
  }

  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      return { ...DEFAULT_CHUNK_CONFIG };
    }
  }

  const parsed = chunkConfigSchema.safeParse(value);
  if (!parsed.success) {
    return { ...DEFAULT_CHUNK_CONFIG };
  }

  const maxChars = parsed.data.maxChars;
  return {
    strategy: parsed.data.strategy,
    maxChars,
    overlap: parsed.data.overlap ?? overlapForMaxChars(maxChars),
    parentChild: parsed.data.parentChild ?? true,
    regex: parsed.data.regex?.trim() || undefined,
    symbol: parsed.data.symbol?.trim() || undefined,
  };
}

export function serializeChunkConfig(config: ChunkConfig): string {
  return JSON.stringify({
    strategy: config.strategy,
    maxChars: config.maxChars,
    overlap: config.overlap,
    parentChild: config.parentChild,
    regex: config.regex,
    symbol: config.symbol,
  });
}
