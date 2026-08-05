"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ConsoleSubpageLayout } from "@/components/console-page-top-bar";
import { DocumentLibrary } from "@/components/document-library";

function KnowledgeDocumentsPageInner() {
  const searchParams = useSearchParams();
  const knowledgeBaseId = searchParams.get("kb")?.trim() || "";
  const [knowledgeBaseName, setKnowledgeBaseName] = useState("知识库文档");

  useEffect(() => {
    if (!knowledgeBaseId) {
      return;
    }

    void fetch(`/api/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}`)
      .then((response) => response.json())
      .then((payload: { knowledgeBase?: { name: string } }) => {
        if (payload.knowledgeBase?.name) {
          setKnowledgeBaseName(payload.knowledgeBase.name);
        }
      })
      .catch(() => undefined);
  }, [knowledgeBaseId]);

  if (!knowledgeBaseId) {
    return (
      <ConsoleSubpageLayout backHref="/knowledge" backLabel="返回知识库列表">
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-slate-500">
          缺少知识库参数。请从{" "}
          <Link href="/knowledge" className="text-cyan-200 hover:text-white">
            知识管理
          </Link>{" "}
          进入。
        </div>
      </ConsoleSubpageLayout>
    );
  }

  return (
    <ConsoleSubpageLayout backHref="/knowledge" backLabel="返回知识库列表">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              知识库
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              {knowledgeBaseName}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/retrieval/workbench?kb=${encodeURIComponent(knowledgeBaseId)}`}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:text-white"
            >
              知识检索
            </Link>
            <Link
              href={`/assistant/chat?kb=${encodeURIComponent(knowledgeBaseId)}`}
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950"
            >
              知识问答
            </Link>
          </div>
        </div>
        <DocumentLibrary knowledgeBaseId={knowledgeBaseId} />
      </div>
    </ConsoleSubpageLayout>
  );
}

export function KnowledgeDocumentsPageClient() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-white/10 px-4 py-8 text-sm text-slate-500">
          正在加载文档…
        </div>
      }
    >
      <KnowledgeDocumentsPageInner />
    </Suspense>
  );
}
