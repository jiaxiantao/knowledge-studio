import type { ChatMessage } from "@/lib/chat-types";
import type { IntelligencePreferences } from "@/lib/front-intelligence-preferences";

export type IntentLabel =
  | "architecture"
  | "performance"
  | "debug"
  | "workflow"
  | "implementation";

export const INTENT_LABELS: Record<IntentLabel, string> = {
  architecture: "架构设计",
  performance: "性能优化",
  debug: "问题排查",
  workflow: "工程流程",
  implementation: "实现落地",
};

export function formatIntentLabel(label: IntentLabel) {
  return INTENT_LABELS[label];
}

export type ComposerIntelligence = {
  intents: Array<{ label: IntentLabel; score: number }>;
  rewrittenPrompt: string | null;
  actions: string[];
  followUps: string[];
};

const intentRules: Record<IntentLabel, RegExp> = {
  architecture: /架构|分层|设计|模块|治理|边界|方案/i,
  performance: /性能|慢|优化|卡顿|耗时|ttfb|ttft|fps|vitals/i,
  debug: /报错|错误|异常|失败|崩溃|排查|debug|修复/i,
  workflow: /流程|规范|协作|ci|发布|回归|测试|review/i,
  implementation: /实现|开发|编码|改造|重构|落地|代码/i,
};

function scoreIntents(input: string) {
  const normalized = input.trim();
  if (!normalized) {
    return [];
  }

  const base = Object.entries(intentRules)
    .map(([label, pattern]) => {
      const matched = pattern.test(normalized);
      return matched ? { label: label as IntentLabel, score: 0.72 } : null;
    })
    .filter(Boolean) as Array<{ label: IntentLabel; score: number }>;

  if (!base.length) {
    return [{ label: "implementation" as IntentLabel, score: 0.45 }];
  }

  return base;
}

function rewritePrompt(input: string, intents: Array<{ label: IntentLabel; score: number }>) {
  const normalized = input.trim();
  if (!normalized) {
    return null;
  }

  const hasConstraint = /步骤|风险|指标|优先级|验收|输出格式/.test(normalized);
  if (normalized.length > 25 && hasConstraint) {
    return null;
  }

  const leadingIntent = intents[0]?.label;
  const intentHint =
    leadingIntent === "performance"
      ? "请包含瓶颈定位、可量化指标与优化顺序。"
      : leadingIntent === "architecture"
        ? "请按目标、模块边界、数据流和风险清单来回答。"
        : leadingIntent === "debug"
          ? "请给排查路径、复现方式和最小修复建议。"
          : "请给步骤、风险与验收标准。";

  return `${normalized}\n\n${intentHint}`;
}

function applyPreferenceHint(
  prompt: string,
  preferences: IntelligencePreferences,
) {
  const styleHint =
    preferences.style === "risk"
      ? "优先列风险、边界条件和回滚方案。"
      : preferences.style === "code"
        ? "优先给可执行代码片段与改动点。"
        : "优先给可执行步骤清单。";

  const depthHint =
    preferences.depth === "brief"
      ? "答案尽量精炼，控制在 5 条以内。"
      : "答案需要完整，包含背景、步骤与注意事项。";

  const metricHint = preferences.includeMetrics
    ? "请补充可量化指标和验收标准。"
    : "无需给出量化指标。";

  return `${prompt}\n${styleHint}\n${depthHint}\n${metricHint}`;
}

export function getPreferenceTemplate(preferences: IntelligencePreferences) {
  const styleLine =
    preferences.style === "risk"
      ? "输出重点：风险、边界条件、回滚方案"
      : preferences.style === "code"
        ? "输出重点：可执行代码片段、改动位置、验证方式"
        : "输出重点：步骤拆解、实施顺序、执行清单";
  const depthLine =
    preferences.depth === "brief"
      ? "回答粒度：简略（<= 5 点）"
      : "回答粒度：详细（背景+步骤+注意事项）";
  const metricLine = preferences.includeMetrics
    ? "指标要求：包含可量化验收指标"
    : "指标要求：可省略量化指标";

  return [styleLine, depthLine, metricLine];
}

function actionHints(intents: Array<{ label: IntentLabel; score: number }>) {
  const labels = intents.map((item) => item.label);
  const actions = new Set<string>();

  actions.add("回答时附上 3 条可执行步骤");
  actions.add("补充风险与回滚方案");

  if (labels.includes("performance")) {
    actions.add("给出 p50/p95 目标与观测方式");
  }
  if (labels.includes("architecture")) {
    actions.add("给出模块边界与依赖图建议");
  }
  if (labels.includes("debug")) {
    actions.add("优先给最小复现和定位路径");
  }

  return [...actions].slice(0, 4);
}

function followUpSuggestions(messages: ChatMessage[]) {
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  if (!lastAssistant?.content.trim()) {
    return [];
  }

  const body = lastAssistant.content;
  const suggestions = new Set<string>();

  if (/性能|耗时|延迟|ms|p95/i.test(body)) {
    suggestions.add("把方案拆成 1 天可完成的优化任务");
  }
  if (/架构|模块|边界|分层/i.test(body)) {
    suggestions.add("请给出该架构的迁移顺序与风险");
  }
  if (/测试|回归|验证|监控/i.test(body)) {
    suggestions.add("补一份可直接执行的验证清单");
  }

  suggestions.add("基于当前回答再给一个低成本版本");
  return [...suggestions].slice(0, 3);
}

export function analyzeComposer(
  input: string,
  messages: ChatMessage[],
  preferences: IntelligencePreferences,
): ComposerIntelligence {
  const intents = scoreIntents(input);
  const rewrittenBase = rewritePrompt(input, intents);
  return {
    intents,
    rewrittenPrompt: rewrittenBase
      ? applyPreferenceHint(rewrittenBase, preferences)
      : null,
    actions: actionHints(intents),
    followUps: followUpSuggestions(messages),
  };
}
