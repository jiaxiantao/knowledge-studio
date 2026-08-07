import {
  answerQuestionWithNotes,
  getMockStreamAnswer,
  openAnswerQuestionStream,
  streamMockAnswer,
} from "@/lib/ai-service";
import { parseAssistantAnswer } from "@/lib/assistant-answer";
import { computeConfidenceFromReferences } from "@/lib/chat-confidence";
import type { ChatHistoryTurn } from "@/lib/chat-types";
import { isLlmConfigured } from "@/lib/llm-config";
import { getMinRetrievalScore, getKeywordMinScore } from "@/lib/rag-config";
import {
  searchChunks,
  type RetrievedChunk,
} from "@/lib/vector-search";

export type ChatReference = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
  tags: string[];
  score: number;
  similarity: number;
};

export type ChatAnswerResult = {
  answer: string;
  mock: boolean;
  references: ChatReference[];
  meta: {
    searchMs: number;
    minScore: number;
    hitCount: number;
    retrievalMode: string;
  };
};

export function mapChatReferences(chunks: RetrievedChunk[]): ChatReference[] {
  return [...chunks]
    .sort((left, right) => right.score - left.score)
    .map((chunk) => ({
      id: chunk.id,
      title: `${chunk.documentName} · #${chunk.index + 1}`,
      slug: chunk.documentId,
      summary: chunk.content.slice(0, 160),
      knowledgeBaseId: chunk.knowledgeBaseId,
      knowledgeBaseName: chunk.knowledgeBaseName,
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
  const keywordMinScore = getKeywordMinScore();
  return chunks
    .filter(
      (chunk) =>
        (chunk.vectorScore ?? chunk.score) >= minScore ||
        (chunk.keywordScore ?? 0) >= keywordMinScore,
    )
    .sort((left, right) => right.score - left.score);
}

export function sanitizeChatHistory(
  history: ChatHistoryTurn[] | undefined,
): ChatHistoryTurn[] {
  if (!history?.length) {
    return [];
  }

  return history.map((turn) => {
    if (turn.role !== "assistant") {
      return turn;
    }
    const parsed = parseAssistantAnswer(turn.content);
    return {
      role: "assistant",
      content: parsed.conclusion || turn.content,
    };
  });
}

export function createChatSseStream(
  question: string,
  matchedChunks: RetrievedChunk[],
  options: {
    temperature?: number;
    regenerate?: boolean;
    history?: ChatHistoryTurn[];
    searchMs?: number;
  } = {},
) {
  const encoder = new TextEncoder();
  const relevantChunks = filterRelevantChunks(matchedChunks);
  const minScore = getMinRetrievalScore();

  return new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const contextBlocks = toContextBlocks(relevantChunks);
      const history = sanitizeChatHistory(options.history);
      const useLlm = isLlmConfigured();
      const temperature =
        options.temperature ?? (options.regenerate ? 0.55 : 0.2);

      // 先发起模型请求，再推 references，与 TTFT 重叠
      const llmStreamPromise = useLlm
        ? openAnswerQuestionStream({
            question,
            contextBlocks,
            history,
            temperature,
          })
        : null;

      const references = mapChatReferences(relevantChunks);
      send("references", { references });

      const { confidence, confidenceLabel } =
        computeConfidenceFromReferences(references);
      send("meta", {
        confidence,
        confidenceLabel,
        alternatives: [] as string[],
        searchMs: options.searchMs,
        minScore,
        hitCount: relevantChunks.length,
      });
      send("status", {
        stage: "generating",
        message: "模型生成中…",
      });

      try {
        let usedMock = !useLlm;

        try {
          const answerStream = llmStreamPromise
            ? await llmStreamPromise
            : streamMockAnswer(getMockStreamAnswer(question));

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

export async function runChatAnswer(input: {
  question: string;
  knowledgeBaseIds: string[];
  history?: ChatHistoryTurn[];
  temperature?: number;
  regenerate?: boolean;
  stream?: boolean;
}): Promise<
  | { kind: "stream"; body: ReadableStream; searchMs: number }
  | { kind: "json"; result: ChatAnswerResult }
> {
  const topK = Math.min(20, Math.max(5, input.knowledgeBaseIds.length * 4));
  const searchStarted = Date.now();
  const { results: matchedChunks, meta: searchMeta } = await searchChunks(
    input.question,
    topK,
    input.knowledgeBaseIds,
  );
  const searchMs = Date.now() - searchStarted;
  const history = sanitizeChatHistory(input.history);

  if (input.stream) {
    return {
      kind: "stream",
      body: createChatSseStream(input.question, matchedChunks, {
        temperature: input.temperature,
        regenerate: input.regenerate,
        history,
        searchMs,
      }),
      searchMs,
    };
  }

  const relevantChunks = matchedChunks;
  const contextBlocks = toContextBlocks(relevantChunks);

  let answer: string;
  let mock = false;

  if (isLlmConfigured()) {
    try {
      answer = await answerQuestionWithNotes({
        question: input.question,
        contextBlocks,
        history,
      });
    } catch {
      answer = getMockStreamAnswer(input.question);
      mock = true;
    }
  } else {
    answer = getMockStreamAnswer(input.question);
    mock = true;
  }

  return {
    kind: "json",
    result: {
      answer,
      mock,
      references: mapChatReferences(relevantChunks),
      meta: {
        searchMs,
        minScore: getMinRetrievalScore(),
        hitCount: relevantChunks.length,
        retrievalMode: searchMeta.mode,
      },
    },
  };
}
