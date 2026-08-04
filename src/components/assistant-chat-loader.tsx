"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const AssistantChat = dynamic(
  () =>
    import("@/components/assistant-chat").then((module) => module.AssistantChat),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-4xl border border-white/10 bg-white/5 p-8 text-sm text-slate-400">
        正在加载对话工作台…
      </div>
    ),
  },
);

export function AssistantChatLoader({
  initialQuestion: initialQuestionProp,
  autoRun,
  llmLabel,
}: {
  initialQuestion?: string;
  autoRun?: boolean;
  llmLabel?: string;
}) {
  const [urlQuestion] = useState(() =>
    typeof window === "undefined"
      ? undefined
      : (new URLSearchParams(window.location.search).get("q") ?? undefined),
  );
  const initialQuestion = initialQuestionProp?.trim()
    ? initialQuestionProp
    : urlQuestion;

  const shouldAutoRun = autoRun ?? Boolean(initialQuestion?.trim());

  return (
    <AssistantChat
      initialQuestion={initialQuestion}
      autoRun={shouldAutoRun}
      llmLabel={llmLabel}
    />
  );
}
