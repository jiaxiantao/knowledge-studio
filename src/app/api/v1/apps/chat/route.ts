import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiKey } from "@/lib/auth/require-api-key";
import { runChatAnswer } from "@/lib/chat-answer";
import type { ChatHistoryTurn } from "@/lib/chat-types";
import {
  assertKnowledgeBasesOwned,
  KnowledgeBaseAccessError,
} from "@/lib/ownership";
import { isStaticSite } from "@/lib/site-mode";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(8000),
});

const v1Schema = z.object({
  input: z.object({
    agent_id: z.union([
      z.string().trim().min(1, "agent_id 不能为空"),
      z
        .array(z.string().trim().min(1))
        .min(1, "至少选择一个知识库")
        .max(15, "最多 15 个知识库"),
    ]),
    messages: z.array(messageSchema).min(1).max(24),
  }),
  parameters: z
    .object({
      stream: z.boolean().optional(),
      temperature: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

function normalizeAgentIds(
  agentId: string | string[],
): string[] {
  return [...new Set(Array.isArray(agentId) ? agentId : [agentId])];
}

function splitMessages(messages: z.infer<typeof messageSchema>[]): {
  question: string;
  history: ChatHistoryTurn[];
} {
  const lastUserIndex = [...messages]
    .map((item, index) => ({ item, index }))
    .reverse()
    .find((entry) => entry.item.role === "user")?.index;

  if (lastUserIndex === undefined) {
    throw new Error("messages 中至少需要一条 user 消息");
  }

  const question = messages[lastUserIndex]!.content;
  const history = messages
    .slice(0, lastUserIndex)
    .filter(
      (item): item is ChatHistoryTurn =>
        item.role === "user" || item.role === "assistant",
    )
    .slice(-12);

  return { question, history };
}

export async function POST(request: Request) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support external chat API" },
      { status: 400 },
    );
  }

  const keyAuth = await requireApiKey(request);
  if (keyAuth.error) {
    return keyAuth.error;
  }

  const requestId = randomUUID();

  try {
    const body = v1Schema.parse(await request.json());
    const { question, history } = splitMessages(body.input.messages);
    const knowledgeBaseIds = await assertKnowledgeBasesOwned(
      normalizeAgentIds(body.input.agent_id),
      keyAuth.auth.userId,
    );

    const stream = body.parameters?.stream === true;
    const outcome = await runChatAnswer({
      question,
      knowledgeBaseIds,
      history,
      temperature: body.parameters?.temperature,
      stream,
    });

    if (outcome.kind === "stream") {
      return new Response(outcome.body, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Request-Id": requestId,
        },
      });
    }

    return NextResponse.json({
      request_id: requestId,
      output: {
        text: outcome.result.answer,
        references: outcome.result.references,
        mock: outcome.result.mock,
      },
      usage: outcome.result.meta,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          request_id: requestId,
          error: error.issues[0]?.message ?? "Invalid payload",
        },
        { status: 400 },
      );
    }

    if (error instanceof KnowledgeBaseAccessError) {
      return NextResponse.json(
        { request_id: requestId, error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof Error && error.message.includes("user 消息")) {
      return NextResponse.json(
        { request_id: requestId, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        request_id: requestId,
        error:
          error instanceof Error ? error.message : "Failed to generate answer",
      },
      { status: 500 },
    );
  }
}
