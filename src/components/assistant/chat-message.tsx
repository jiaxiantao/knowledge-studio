"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";

import { AssistantMarkdown } from "@/components/assistant/assistant-markdown";
import { parseAssistantAnswer } from "@/lib/assistant-answer";
import type { ChatMessage } from "@/lib/chat-types";

type ChatMessageProps = {
  message: ChatMessage;
  isStreaming: boolean;
};

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
    </div>
  );
}
