import { NextResponse } from "next/server";
import { z } from "zod";

import {
  answerQuestionWithNotes,
  getMockStreamAnswer,
  streamAnswerQuestionWithNotes,
  streamMockAnswer,
} from "@/lib/ai-service";
import { computeConfidenceFromReferences } from "@/lib/chat-confidence";
import { isLlmConfigured } from "@/lib/llm-config";
import { getMinRetrievalScore } from "@/lib/rag-config";
import {
  searchChunksByVector,
  type RetrievedChunk,
} from "@/lib/vector-search";

const chatSchema = z.object({
  question: z.string().min(1, "Question is required"),
  stream: z.boolean().optional(),
  regenerate: z.boolean().optional(),
  temperature: z.number().min(0).max(1).optional(),
  knowledgeBaseId: z.string().trim().min(1).optional(),
});

function mapReferences(chunks: RetrievedChunk[]) {
  return chunks.map((chunk) => ({
    id: chunk.id,
    title: `${chunk.documentName} · #${chunk.index + 1}`,
    slug: chunk.documentId,
    summary: chunk.content.slice(0, 160),
    tags: [] as string[],
    score: chunk.score,
    similarity: chunk.score,
  }));
}

function toContextBlocks(chunks: RetrievedChunk[]) {
  return chunks.map((chunk) => ({
    id: chunk.id,
    title: chunk.documentName,
    summary: `切片 #${chunk.index + 1}`,
    contentMarkdown: chunk.content,
    tags: [] as string[],
  }));
}

function filterRelevantChunks(chunks: RetrievedChunk[]) {
  const minScore = getMinRetrievalScore();
  return chunks.filter((chunk) => chunk.score >= minScore);
}

function createSseStream(
  question: string,
  matchedChunks: RetrievedChunk[],
  options: { temperature?: number; regenerate?: boolean } = {},
) {
  const encoder = new TextEncoder();
  const relevantChunks = filterRelevantChunks(matchedChunks);

  return new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const references = mapReferences(relevantChunks);
      send("references", { references });

      const { confidence, confidenceLabel } =
        computeConfidenceFromReferences(references);
      send("meta", {
        confidence,
        confidenceLabel,
        alternatives: [] as string[],
      });

      try {
        const contextBlocks = toContextBlocks(relevantChunks);

        const useLlm = isLlmConfigured();
        const temperature =
          options.temperature ?? (options.regenerate ? 0.55 : 0.2);
        let usedMock = !useLlm;

        const answerStream = useLlm
          ? streamAnswerQuestionWithNotes({
              question,
              contextBlocks,
              temperature,
            })
          : streamMockAnswer(getMockStreamAnswer(question));

        try {
          for await (const chunk of answerStream) {
            send("chunk", { text: chunk });
          }
        } catch (streamError) {
          if (!useLlm) {
            throw streamError;
          }

          usedMock = true;
          for await (const chunk of streamMockAnswer(
            getMockStreamAnswer(question),
          )) {
            send("chunk", { text: chunk });
          }
        }

        send("done", { streamed: true, mock: usedMock });
      } catch (error) {
        send("error", {
          message:
            error instanceof Error ? error.message : "Failed to stream answer",
        });
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = chatSchema.parse(await request.json());
    const matchedChunks = await searchChunksByVector(
      body.question,
      5,
      body.knowledgeBaseId ? [body.knowledgeBaseId] : undefined,
    );
    const relevantChunks = filterRelevantChunks(matchedChunks);

    if (body.stream) {
      return new Response(
        createSseStream(body.question, matchedChunks, {
          temperature: body.temperature,
          regenerate: body.regenerate,
        }),
        {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        },
      );
    }

    const contextBlocks = toContextBlocks(relevantChunks);

    let answer: string;
    let mock = false;

    if (isLlmConfigured()) {
      try {
        answer = await answerQuestionWithNotes({
          question: body.question,
          contextBlocks,
        });
      } catch {
        answer = getMockStreamAnswer(body.question);
        mock = true;
      }
    } else {
      answer = getMockStreamAnswer(body.question);
      mock = true;
    }

    return NextResponse.json({
      answer,
      mock,
      references: mapReferences(relevantChunks),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid chat payload", details: error.flatten() },
        { status: 400 },
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
