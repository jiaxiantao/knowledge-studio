"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { ConsoleSubpageLayout } from "@/components/console-page-top-bar";
import { RetrievalEvalPanel } from "@/components/retrieval/retrieval-eval-panel";

function RetrievalEvalPageInner() {
  const searchParams = useSearchParams();
  const knowledgeBaseId = searchParams.get("kb")?.trim() || "";

  return (
    <ConsoleSubpageLayout backHref="/retrieval" backLabel="返回检索列表">
      <RetrievalEvalPanel initialKnowledgeBaseId={knowledgeBaseId} />
    </ConsoleSubpageLayout>
  );
}

export function RetrievalEvalPageClient() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-white/10 px-4 py-16 text-center text-sm text-slate-500">
          正在加载评测台…
        </div>
      }
    >
      <RetrievalEvalPageInner />
    </Suspense>
  );
}