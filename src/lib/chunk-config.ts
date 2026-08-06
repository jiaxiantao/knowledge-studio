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
  maxChars: number;
  overlap: number;
  regex?: string;
  symbol?: string;
};

export const CHUNK_STRATEGY_LABELS: Record<
  ChunkStrategy,
  { title: string; description: string }
> = {
  smart: {
    title: "智能切分",
    description: "按段落合并，适合大多数文档，检索效果较好",
  },
  length: {
    title: "按长度切分",
    description: "固定长度滑动窗口，适合对 token 有严格要求的场景",
  },
  page: {
    title: "按页切分",
    description: "按 PDF 页或分页标记切分，不同页内容不会混在同一切片",
  },
  title: {
    title: "按标题切分",
    description: "按 Markdown / 章节标题切分，保持章节语义完整",
  },
  regex: {
    title: "按正则切分",
    description: "使用自定义正则表达式作为切分点",
  },
  symbol: {
    title: "按符号切分",
    description: "使用自定义分隔符切分",
  },
};

export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  strategy: "smart",
  maxChars: 600,
  overlap: 64,
};

const chunkConfigSchema = z.object({
  strategy: z.enum(CHUNK_STRATEGIES).default("smart"),
  maxChars: z.number().int().min(10).max(6000).default(600),
  overlap: z.number().int().min(0).max(512).optional(),
  regex: z.string().max(500).optional(),
  symbol: z.string().max(64).optional(),
});

export function overlapForMaxChars(maxChars: number) {
  return Math.min(128, Math.max(16, Math.floor(maxChars * 0.11)));
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
    regex: parsed.data.regex?.trim() || undefined,
    symbol: parsed.data.symbol?.trim() || undefined,
  };
}

export function serializeChunkConfig(config: ChunkConfig): string {
  return JSON.stringify({
    strategy: config.strategy,
    maxChars: config.maxChars,
    overlap: config.overlap,
    regex: config.regex,
    symbol: config.symbol,
  });
}
