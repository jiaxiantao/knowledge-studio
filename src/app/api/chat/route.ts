import { NextResponse } from "next/server";
import { z } from "zod";

import {
  answerQuestionWithNotes,
  getMockStreamAnswer,
  streamAnswerQuestionWithNotes,
  streamMockAnswer,
} from "@/lib/ai-service";
import {
  buildAlternativePrompts,
  computeConfidenceFromReferences,
} from "@/lib/chat-confidence";
import { isLlmConfigured } from "@/lib/llm-config";
import { searchNotes } from "@/lib/note-search";

const chatSchema = z.object({
  question: z.string().min(1, "Question is required"),
  stream: z.boolean().optional(),
  regenerate: z.boolean().optional(),
  temperature: z.number().min(0).max(1).optional(),
});

function mapReferences(
  notes: Awaited<ReturnType<typeof searchNotes>>,
) {
  return notes.map((note) => ({
    id: note.id,
    title: note.title,
    slug: note.slug,
    summary: note.summary,
    tags: note.tags,
    score: note.score,
    similarity: note.similarity,
  }));
}

function createSseStream(
  question: string,
  matchedNotes: Awaited<ReturnType<typeof searchNotes>>,
  options: { temperature?: number; regenerate?: boolean } = {},
) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const references = mapReferences(matchedNotes);
      send("references", { references });

      const { confidence, confidenceLabel } =
        computeConfidenceFromReferences(references);
      send("meta", {
        confidence,
        confidenceLabel,
        alternatives: buildAlternativePrompts(question, references),
      });

      try {
        const contextBlocks = matchedNotes.map((note) => ({
          id: note.id,
          title: note.title,
          summary: note.summary,
          contentMarkdown: note.contentMarkdown,
          tags: note.tags,
        }));

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
    const matchedNotes = await searchNotes(body.question, 5);

    if (body.stream) {
      return new Response(
        createSseStream(body.question, matchedNotes, {
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

    const contextBlocks = matchedNotes.map((note) => ({
      id: note.id,
      title: note.title,
      summary: note.summary,
      contentMarkdown: note.contentMarkdown,
      tags: note.tags,
    }));

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
      references: mapReferences(matchedNotes),
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
          hint: "Set LLM_PROVIDER=ollama and run: ollama serve && ollama pull llama3.2",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to generate answer" },
      { status: 500 },
    );
  }
}
