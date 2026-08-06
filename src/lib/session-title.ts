import OpenAI from "openai";

import { parseAssistantAnswer } from "@/lib/assistant-answer";
import { getLlmConfig, isLlmConfigured } from "@/lib/llm-config";

const TITLE_MIN = 4;
const TITLE_MAX = 18;

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

/** Heuristic short title when LLM is unavailable. */
export function buildFallbackSessionTitle(question: string) {
  let text = question
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[「『"']+|[」』"']+$/g, "");

  text = text
    .replace(
      /^(请问|我想问一下|我想|我现在需要|我需要|我想要|帮我|请帮我|能否|可以|你能|麻烦)/g,
      "",
    )
    .replace(/(吗|呢|呀|啊)+$/g, "")
    .replace(/[？?！!。.…]+$/g, "")
    .replace(/^(实现一个|做一个|写一个|开发一个)/, "实现")
    .trim();

  // Prefer the clause before “但是/不知道/怎么”
  const cut = text.search(/[，,]?(但是|可是|不知道|怎么|如何|可以)/);
  if (cut > 4) {
    text = text.slice(0, cut).trim();
  }

  text = text.replace(/的组件$/, "组件").replace(/一个/g, "");

  if (text.length < TITLE_MIN) {
    text = question.trim().slice(0, TITLE_MAX);
  }

  return text.slice(0, TITLE_MAX).trim() || "新对话";
}

function normalizeTitle(raw: string, question: string) {
  let title = raw
    .trim()
    .replace(/^["'「『【\[]+|["'」』】\]]+$/g, "")
    .replace(/^(标题[:：]\s*)/i, "")
    .replace(/[？?！!。.\s]+$/g, "")
    .replace(/\s+/g, "")
    .trim();

  if (!title) {
    return buildFallbackSessionTitle(question);
  }

  // Reject if model echoed the whole question.
  if (title.length > TITLE_MAX + 4 || title === question.trim()) {
    return buildFallbackSessionTitle(question);
  }

  if (title.length < TITLE_MIN) {
    return buildFallbackSessionTitle(question);
  }

  return title.slice(0, TITLE_MAX);
}

export async function generateSessionTitle(
  question: string,
  answer?: string,
): Promise<string> {
  const q = question.trim();
  if (!q) {
    return "新对话";
  }

  if (!isLlmConfigured()) {
    return buildFallbackSessionTitle(q);
  }

  try {
    const client = getClient();
    const { model } = getLlmConfig();
    const a = answer ? extractAnswerText(answer).slice(0, 400) : "";

    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "你是对话标题生成器。",
            "根据用户首轮问题，生成一个简短中文标题，概括话题核心。",
            `要求：${TITLE_MIN}-${TITLE_MAX} 个字；名词短语；不要完整复述原句；不要疑问语气；不要引号、序号、冒号前缀。`,
            "只输出标题本身，不要解释。",
            "示例：问题「我现在需要实现一个拓扑图的组件，但是不知道从哪里入手，你可以教我怎么做吗」→ 实现拓扑图组件",
          ].join("\n"),
        },
        {
          role: "user",
          content: a
            ? `用户问题：\n${q}\n\n助手回答摘要（可选参考）：\n${a}`
            : `用户问题：\n${q}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "";
    return normalizeTitle(content, q);
  } catch {
    return buildFallbackSessionTitle(q);
  }
}
