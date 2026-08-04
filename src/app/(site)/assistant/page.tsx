import type { Metadata } from "next";

import { AssistantChatLoader } from "@/components/assistant-chat-loader";
import { BorderGlow } from "@/components/reactbits/border-glow";
import { SystemRuntimeStrip } from "@/components/system-runtime-strip";
import { getLlmLabel, isLlmConfigured } from "@/lib/llm-config";

export const metadata: Metadata = {
  title: "Assistant | XJ / Frontend Systems",
  description:
    "An AI assistant that answers questions by retrieving and grounding responses in my notes.",
};

export const dynamic = "force-static";

export default function AssistantPage() {
  const llmLabel = isLlmConfigured() ? getLlmLabel() : undefined;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-10 lg:px-8 lg:py-16">
      <BorderGlow
        className="rounded-4xl"
        glowColor="rgba(103, 232, 249, 0.26)"
        backgroundColor="rgba(2, 6, 23, 0.24)"
      >
      <section className="rounded-4xl border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Assistant</p>
        <h1 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
          AI 对话工作台
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
          流式 Markdown、停止生成、图片/语音输入、多会话与分支、置信度与重新生成。笔记经
          pg_trgm 召回后 SSE 推送回答。
        </p>
        <div className="mt-6">
          <SystemRuntimeStrip />
        </div>
      </section>
      </BorderGlow>

      <section className="space-y-6">
        <AssistantChatLoader llmLabel={llmLabel} />
      </section>
    </main>
  );
}
