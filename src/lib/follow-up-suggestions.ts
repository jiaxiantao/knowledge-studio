import OpenAI from "openai";

import { parseAssistantAnswer } from "@/lib/assistant-answer";
import { getLlmConfig, isLlmConfigured } from "@/lib/llm-config";

function getClient() {
  const { baseURL, apiKey } = getLlmConfig();

  return new OpenAI({
    apiKey,
    baseURL,
  });
}

function extractAnswerText(rawAnswer: string) {
  const parsed = parseAssistantAnswer(rawAnswer);
  return (parsed.conclusion || rawAnswer).trim();
}

function normalizeSuggestions(items: string[], question: string) {
  const seen = new Set<string>();
  const questionNorm = question.trim().toLowerCase();

  return items
    .map((item) => item.replace(/^[\d.、)）\-\*\s]+/, "").trim())
    .filter((item) => item.length >= 6 && item.length <= 48)
    .filter((item) => item.toLowerCase() !== questionNorm)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

export function buildFallbackFollowUps(question: string, answer: string) {
  const q = question.trim();
  const a = extractAnswerText(answer);
  const suggestions: string[] = [];

  if (/架构|技术选型|评审/.test(q + a)) {
    suggestions.push("这项技术选型有哪些主要风险？");
    suggestions.push("给我一份可落地的评审检查清单");
  } else if (/性能|排查|慢|卡顿/.test(q + a)) {
    suggestions.push("按优先级列出排查步骤");
    suggestions.push("怎么验证优化是否有效？");
  } else if (/AI|模型|RAG|向量/.test(q + a)) {
    suggestions.push("如何把这套流程接到现有工程里？");
    suggestions.push("有哪些低成本的替代方案？");
  } else {
    suggestions.push("请把结论再拆成可执行步骤");
    suggestions.push("还有哪些需要注意的边界情况？");
  }

  suggestions.push("基于刚才的回答再给一个更简洁的版本");
  return normalizeSuggestions(suggestions, q);
}

function parseSuggestionPayload(raw: string) {
  const trimmed = raw.trim();

  try {
    const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    }
  } catch {
    // fall through to line parsing
  }

  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function generateFollowUpSuggestions(
  question: string,
  answer: string,
): Promise<string[]> {
  const q = question.trim();
  const a = extractAnswerText(answer);

  if (!q || !a) {
    return [];
  }

  if (!isLlmConfigured()) {
    return buildFallbackFollowUps(q, a);
  }

  try {
    const client = getClient();
    const { model } = getLlmConfig();

    const response = await client.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: [
            "你是知识问答产品的追问推荐器。",
            "根据用户问题与助手结论，生成 3 条中文追问，帮助用户继续深入。",
            "要求：每条独立成问、具体可点、不要重复原问题、不要解释。",
            '只输出 JSON 数组，例如：["问题1","问题2","问题3"]',
          ].join("\n"),
        },
        {
          role: "user",
          content: `用户问题：\n${q}\n\n助手结论：\n${a.slice(0, 1200)}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "";
    const parsed = normalizeSuggestions(parseSuggestionPayload(content), q);

    if (parsed.length >= 2) {
      return parsed;
    }
  } catch {
    // fall through
  }

  return buildFallbackFollowUps(q, a);
}
