"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { ConsoleSubpageLayout } from "@/components/console-page-top-bar";
import { RetrievalWorkbench } from "@/components/retrieval/retrieval-workbench";

function RetrievalWorkbenchPageInner() {
  const searchParams = useSearchParams();
  const knowledgeBaseId = searchParams.get("kb")?.trim() || "";

  if (!knowledgeBaseId) {
    return (
      <ConsoleSubpageLayout backHref="/retrieval" backLabel="返回检索列表">
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-slate-500">
          缺少知识库参数。请从{" "}
          <Link href="/retrieval" className="text-cyan-200 hover:text-white">
            知识检索
          </Link>{" "}
          选择服务进入。
        </div>
      </ConsoleSubpageLayout>
    );
  }

  return (
    <ConsoleSubpageLayout backHref="/retrieval" backLabel="返回检索列表" fullHeight>
      <RetrievalWorkbench knowledgeBaseId={knowledgeBaseId} />
    </ConsoleSubpageLayout>
  );
}

export function RetrievalWorkbenchPageClient() {
  return (
    <div className="h-full min-h-0">
      <Suspense
        fallback={
          <div className="flex h-full min-h-0 items-center justify-center rounded-3xl border border-white/10 px-4 py-16 text-center text-sm text-slate-500">
            正在加载检索工作台…
          </div>
        }
      >
        <RetrievalWorkbenchPageInner />
      </Suspense>
    </div>
  );
}
