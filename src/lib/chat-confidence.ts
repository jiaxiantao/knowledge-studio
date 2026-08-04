import type { ChatStreamMeta } from "@/lib/chat-types";

type ScoredReference = {
  title: string;
  score?: number;
  similarity?: number;
};

export function computeConfidenceFromReferences(
  references: ScoredReference[],
): Pick<ChatStreamMeta, "confidence" | "confidenceLabel"> {
  if (!references.length) {
    return { confidence: 0.25, confidenceLabel: "低 · 未召回笔记" };
  }

  const scores = references.map((ref) => {
    if (typeof ref.similarity === "number") {
      return Math.min(1, Math.max(0, ref.similarity));
    }

    const raw = ref.score ?? 0;
    return Math.min(1, raw / 12);
  });

  const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const confidence = Math.round(avg * 100) / 100;

  if (confidence >= 0.72) {
    return { confidence, confidenceLabel: "高 · 笔记支撑充分" };
  }

  if (confidence >= 0.45) {
    return { confidence, confidenceLabel: "中 · 建议核对引用" };
  }

  return { confidence, confidenceLabel: "低 · 上下文较弱" };
}

export function buildAlternativePrompts(
  question: string,
  references: ScoredReference[],
): string[] {
  const top = references.slice(0, 2);

  const fromNotes = top.map(
    (ref) => `从「${ref.title}」角度再展开：${question.slice(0, 40)}`,
  );

  return [
    ...fromNotes,
    `用更偏工程实践的方式回答：${question.slice(0, 48)}`,
    `列出 3 条可执行检查清单：${question.slice(0, 40)}`,
  ].slice(0, 3);
}
