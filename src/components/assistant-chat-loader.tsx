"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const AssistantChat = dynamic(
  () =>
    import("@/components/assistant-chat").then((module) => module.AssistantChat),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-3xl border border-white/10 bg-slate-950/40 px-5 py-16 text-center text-sm text-slate-500">
        加载中…
      </div>
    ),
  },
);

function AssistantChatLoaderInner({
  initialQuestion: initialQuestionProp,
  autoRun,
  llmLabel,
  knowledgeBaseId: knowledgeBaseIdProp,
}: {
  initialQuestion?: string;
  autoRun?: boolean;
  llmLabel?: string;
  knowledgeBaseId?: string;
}) {
  const searchParams = useSearchParams();
  const initialQuestion = initialQuestionProp?.trim()
    ? initialQuestionProp
    : (searchParams.get("q")?.trim() || undefined);
  const knowledgeBaseId =
    knowledgeBaseIdProp ??
    (searchParams.get("kb")?.trim() || undefined);

  const shouldAutoRun = autoRun ?? Boolean(initialQuestion?.trim());

  return (
    <AssistantChat
      key={knowledgeBaseId}
      initialQuestion={initialQuestion}
      autoRun={shouldAutoRun}
      llmLabel={llmLabel}
      knowledgeBaseId={knowledgeBaseId}
    />
  );
}

export function AssistantChatLoader(
  props: {
    initialQuestion?: string;
    autoRun?: boolean;
    llmLabel?: string;
    knowledgeBaseId?: string;
  } = {},
) {
  return (
    <div className="h-full min-h-0">
      <Suspense
        fallback={
          <div className="flex h-full min-h-0 items-center justify-center rounded-3xl border border-white/10 bg-slate-950/40 px-5 py-16 text-center text-sm text-slate-500">
            加载中…
          </div>
        }
      >
        <AssistantChatLoaderInner {...props} />
      </Suspense>
    </div>
  );
}
