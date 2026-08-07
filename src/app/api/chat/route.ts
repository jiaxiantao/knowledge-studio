import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { runChatAnswer } from "@/lib/chat-answer";
import type { ChatHistoryTurn } from "@/lib/chat-types";
import {
  assertKnowledgeBasesOwned,
  KnowledgeBaseAccessError,
} from "@/lib/ownership";

const historyTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(8000),
});

const chatSchema = z
  .object({
    question: z.string().min(1, "Question is required"),
    stream: z.boolean().optional(),
    regenerate: z.boolean().optional(),
    temperature: z.number().min(0).max(1).optional(),
    knowledgeBaseId: z.string().trim().min(1).optional(),
    knowledgeBaseIds: z.array(z.string().trim().min(1)).max(15).optional(),
    history: z.array(historyTurnSchema).max(12).optional(),
  })
  .superRefine((value, ctx) => {
    const ids = value.knowledgeBaseIds?.filter(Boolean) ?? [];
    if (!ids.length && !value.knowledgeBaseId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "至少选择一个知识库",
        path: ["knowledgeBaseIds"],
      });
    }
  });

function resolveKnowledgeBaseIds(body: z.infer<typeof chatSchema>): string[] {
  const fromList = (body.knowledgeBaseIds ?? []).filter(Boolean);
  if (fromList.length) {
    return [...new Set(fromList)];
  }
  if (body.knowledgeBaseId) {
    return [body.knowledgeBaseId];
  }
  return [];
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = chatSchema.parse(await request.json());
    const knowledgeBaseIds = await assertKnowledgeBasesOwned(
      resolveKnowledgeBaseIds(body),
      auth.user.id,
    );

    const outcome = await runChatAnswer({
      question: body.question,
      knowledgeBaseIds,
      history: body.history as ChatHistoryTurn[] | undefined,
      temperature: body.temperature,
      regenerate: body.regenerate,
      stream: body.stream,
    });

    if (outcome.kind === "stream") {
      return new Response(outcome.body, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    return NextResponse.json(outcome.result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid chat payload", details: error.flatten() },
        { status: 400 },
      );
    }

    if (error instanceof KnowledgeBaseAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof Error && error.message.includes("not configured")) {
      return NextResponse.json(
        {
          error: error.message,
          hint: "Set LLM_PROVIDER=ollama and run: ollama serve && ollama pull qwen3 && ollama pull nomic-embed-text",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate answer",
      },
      { status: 500 },
    );
  }
}
