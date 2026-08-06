"use client";

import Link from "next/link";
import { BookOpen, ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";

import { AssistantMarkdown } from "@/components/assistant/assistant-markdown";
import { parseAssistantAnswer } from "@/lib/assistant-answer";
import type { ChatMessage } from "@/lib/chat-types";

type ChatMessageProps = {
  message: ChatMessage;
  isStreaming: boolean;
};

function confidenceTone(confidence?: number) {
  if (confidence == null) {
    return "text-slate-500";
  }
  if (confidence >= 0.72) {
    return "text-emerald-300";
  }
  if (confidence >= 0.45) {
    return "text-amber-200";
  }
  return "text-rose-300";
}

function MessageReferences({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming: boolean;
}) {
  const references = message.references ?? [];
  if (isStreaming || !references.length) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2 border-t border-white/5 pt-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>引用来源 · {references.length}</span>
        {typeof message.confidence === "number" ? (
          <span className={confidenceTone(message.confidence)}>
            {message.confidenceLabel?.trim() ||
              `置信度 ${(message.confidence * 100).toFixed(0)}%`}
          </span>
        ) : null}
      </div>
      <ul className="grid gap-2">
        {references.map((reference, index) => {
          const href = reference.knowledgeBaseId
            ? `/knowledge/chunks?id=${encodeURIComponent(reference.slug)}&kb=${encodeURIComponent(reference.knowledgeBaseId)}`
            : `/knowledge/chunks?id=${encodeURIComponent(reference.slug)}`;
          const score =
            typeof reference.similarity === "number"
              ? reference.similarity
              : reference.score;

          return (
            <li key={reference.id}>
              <Link
                href={href}
                className="group flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-cyan-300/25 hover:bg-white/[0.05]"
              >
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-400/15 text-[11px] font-medium text-violet-200">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    {reference.knowledgeBaseName ? (
                      <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2 py-0.5 text-[11px] text-violet-100">
                        {reference.knowledgeBaseName}
                      </span>
                    ) : null}
                    <span className="truncate text-sm text-slate-200 group-hover:text-white">
                      {reference.title}
                    </span>
                    {typeof score === "number" ? (
                      <span className="shrink-0 font-mono text-[11px] text-slate-600">
                        {score.toFixed(3)}
                      </span>
                    ) : null}
                  </span>
                  {reference.summary ? (
                    <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {reference.summary}
                    </span>
                  ) : null}
                </span>
                <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-cyan-200" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ChatMessageBubble({ message, isStreaming }: ChatMessageProps) {
  const parsed = parseAssistantAnswer(message.content);
  const isUser = message.role === "user";
  const hasThinking = !isUser && Boolean(parsed.thinking);
  const isThinkingStream = isStreaming && parsed.phase === "thinking";
  const conclusion =
    parsed.conclusion ||
    (!hasThinking && !isUser ? message.content : "");

  // null = follow mainstream default: open while thinking, collapsed after
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const thinkingOpen = userExpanded ?? isThinkingStream;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl bg-white/10 px-4 py-2.5 text-sm leading-7 text-slate-100">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-3">
      {hasThinking ? (
        <div>
          <button
            type="button"
            onClick={() => setUserExpanded(!thinkingOpen)}
            className="group inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
          >
            {isThinkingStream ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>思考中</span>
              </>
            ) : (
              <span>已深度思考</span>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 opacity-70 transition group-hover:opacity-100 ${
                thinkingOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {thinkingOpen ? (
            <div className="mt-2 border-l border-white/10 pl-3 text-[13px] leading-6 text-slate-500">
              <AssistantMarkdown
                content={parsed.thinking}
                streaming={isThinkingStream}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {conclusion ? (
        <AssistantMarkdown
          content={conclusion}
          streaming={
            isStreaming &&
            (parsed.phase === "conclusion" || parsed.phase === "raw")
          }
        />
      ) : isStreaming ? (
        <p className="inline-flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          正在回答…
        </p>
      ) : null}

      <MessageReferences message={message} isStreaming={isStreaming} />
    </div>
  );
}
