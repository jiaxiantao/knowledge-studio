import OpenAI from "openai";

import { getLlmConfig } from "@/lib/llm-config";

type AnswerQuestionArgs = {
  question: string;
  contextBlocks: Array<{
    id: string;
    title: string;
    summary: string | null;
    contentMarkdown: string;
    tags: string[];
  }>;
};

function getClient() {
  const { baseURL, apiKey } = getLlmConfig();

  return new OpenAI({
    apiKey,
    baseURL,
  });
}

function buildContext(contextBlocks: AnswerQuestionArgs["contextBlocks"]) {
  return contextBlocks
    .map((note, index) => {
      const content =
        note.contentMarkdown.length > 2400
          ? `${note.contentMarkdown.slice(0, 2400)}…`
          : note.contentMarkdown;

      return [
        `Note ${index + 1}`,
        `ID: ${note.id}`,
        `Title: ${note.title}`,
        `Tags: ${note.tags.join(", ") || "none"}`,
        `Summary: ${note.summary ?? "none"}`,
        `Content: ${content}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

const systemPrompt =
  "你是本站的知识库助手。主要根据提供的笔记回答，使用简洁的中文。若笔记不足以回答，请明确说明，不要编造。可综合多条笔记作答，避免机械摘抄。";

function buildMessages(question: string, context: string) {
  return [
    { role: "system" as const, content: systemPrompt },
    {
      role: "user" as const,
      content: [`问题：\n${question}`, "相关笔记：", context || "未找到相关笔记。"].join(
        "\n\n",
      ),
    },
  ];
}

export async function answerQuestionWithNotes({
  question,
  contextBlocks,
}: AnswerQuestionArgs) {
  const client = getClient();
  const { model } = getLlmConfig();
  const context = buildContext(contextBlocks);

  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: buildMessages(question, context),
  });

  return (
    response.choices[0]?.message?.content?.trim() ??
    "未能生成回答，请稍后重试。"
  );
}

export async function* streamAnswerQuestionWithNotes({
  question,
  contextBlocks,
  temperature = 0.2,
}: AnswerQuestionArgs & { temperature?: number }) {
  const client = getClient();
  const { model } = getLlmConfig();
  const context = buildContext(contextBlocks);

  const stream = await client.chat.completions.create({
    model,
    temperature,
    stream: true,
    messages: buildMessages(question, context),
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;

    if (delta) {
      yield delta;
    }
  }
}

export function getMockStreamAnswer(question: string) {
  const { model, baseURL } = getLlmConfig();

  return [
    "（演示模式：未连上本地 Ollama）",
    "",
    `问题：${question}`,
    "",
    `请确认 Ollama 已启动且已拉取模型：ollama pull ${model}`,
    `默认地址：${baseURL}`,
    "",
    "启动命令示例：ollama serve",
  ].join("\n");
}

export async function* streamMockAnswer(text: string) {
  const parts = text.split(/(\s+)/);

  for (const part of parts) {
    if (!part) {
      continue;
    }

    yield part;
    await new Promise((resolve) => setTimeout(resolve, 18));
  }
}
