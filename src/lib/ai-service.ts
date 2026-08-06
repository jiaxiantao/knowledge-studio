import OpenAI from "openai";

import { getLlmConfig } from "@/lib/llm-config";
import type { ChatHistoryTurn } from "@/lib/chat-types";

type ContextBlock = {
  id: string;
  title: string;
  summary: string | null;
  contentMarkdown: string;
  tags: string[];
};

type AnswerQuestionArgs = {
  question: string;
  contextBlocks: ContextBlock[];
  history?: ChatHistoryTurn[];
};

const MAX_HISTORY_TURNS = 6;

function getClient() {
  const { baseURL, apiKey } = getLlmConfig();

  return new OpenAI({
    apiKey,
    baseURL,
  });
}

function buildContext(contextBlocks: ContextBlock[]) {
  return contextBlocks
    .map((block, index) => {
      const content =
        block.contentMarkdown.length > 2400
          ? `${block.contentMarkdown.slice(0, 2400)}…`
          : block.contentMarkdown;

      return [
        `Chunk ${index + 1}`,
        `ID: ${block.id}`,
        `Source: ${block.title}`,
        `Tags: ${block.tags.join(", ") || "none"}`,
        `Summary: ${block.summary ?? "none"}`,
        `Content: ${content}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

function buildSystemPrompt(model: string) {
  return [
    "你是 Knowledge Studio 助手，底层模型为本地 Ollama 的 " + model + "。",
    "核心目标：直接、完整地回答用户问题，使用简洁中文。",
    "若提供了相关文档切片，优先引用并综合这些切片，不要编造切片中没有的「文档事实」。",
    "若未提供切片、或切片与问题明显无关：请使用你自身的模型知识正常作答，禁止用「知识库没有」「未找到切片」「请查阅官方文档」一类话术拒绝回答。",
    "只有用户明确在问「我上传的某份文档里写了什么」且确实没有对应切片时，才可说明知识库暂无该材料。",
    "若有多轮对话历史，请结合上文理解指代与追问，但回答仍以当前问题为主。",
    "",
    "必须严格按下面格式输出（不要省略标签，不要在标签外写额外内容）：",
    "<thinking>",
    "用简短条目写出推理过程。",
    "</thinking>",
    "<conclusion>",
    "给出最终回答，直接回应用户问题。",
    "</conclusion>",
  ].join("\n");
}

function normalizeHistory(history: ChatHistoryTurn[] | undefined) {
  if (!history?.length) {
    return [] as ChatHistoryTurn[];
  }

  return history
    .filter(
      (turn) =>
        (turn.role === "user" || turn.role === "assistant") &&
        turn.content.trim(),
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({
      role: turn.role,
      content: turn.content.trim().slice(0, 4000),
    }));
}

function buildMessages(
  question: string,
  context: string,
  model: string,
  hasContext: boolean,
  history: ChatHistoryTurn[] = [],
) {
  const contextSection = hasContext
    ? ["相关文档切片（请优先参考）：", context].join("\n")
    : [
        "相关文档切片：无。",
        "请基于你的模型知识直接完整回答，不要以缺少知识库材料为由拒绝。",
      ].join("\n");

  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: buildSystemPrompt(model) }];

  for (const turn of history) {
    messages.push({
      role: turn.role,
      content: turn.content,
    });
  }

  messages.push({
    role: "user",
    content: [`问题：\n${question}`, contextSection].join("\n\n"),
  });

  return messages;
}

export async function answerQuestionWithNotes({
  question,
  contextBlocks,
  history,
}: AnswerQuestionArgs) {
  const client = getClient();
  const { model } = getLlmConfig();
  const hasContext = contextBlocks.length > 0;
  const context = buildContext(contextBlocks);
  const turns = normalizeHistory(history);

  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: buildMessages(question, context, model, hasContext, turns),
  });

  return (
    response.choices[0]?.message?.content?.trim() ??
    "未能生成回答，请稍后重试。"
  );
}

export async function* streamAnswerQuestionWithNotes({
  question,
  contextBlocks,
  history,
  temperature = 0.2,
}: AnswerQuestionArgs & { temperature?: number }) {
  const client = getClient();
  const { model } = getLlmConfig();
  const hasContext = contextBlocks.length > 0;
  const context = buildContext(contextBlocks);
  const turns = normalizeHistory(history);

  const stream = await client.chat.completions.create({
    model,
    temperature,
    stream: true,
    messages: buildMessages(question, context, model, hasContext, turns),
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
    "<thinking>",
    "当前处于演示模式，未连上本地 Ollama，无法基于文档切片做真实召回推理。",
    `用户问题：「${question}」`,
    "需要先确认模型服务可用，再重新提问。",
    "</thinking>",
    "<conclusion>",
    "请先启动 Ollama 并拉取模型后再试：",
    "",
    `\`\`\`bash\nollama serve\nollama pull ${model}\nollama pull nomic-embed-text\n\`\`\``,
    "",
    `默认接口：${baseURL}`,
    "</conclusion>",
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
