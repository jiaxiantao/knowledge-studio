"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { ConsoleSubpageLayout } from "@/components/console-page-top-bar";
import { DocumentPreviewView } from "@/components/document-preview-view";

function DocumentPreviewPageInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.trim() || "";
  const knowledgeBaseId = searchParams.get("kb")?.trim() || "";
  const documentsHref = knowledgeBaseId
    ? `/knowledge/documents?kb=${encodeURIComponent(knowledgeBaseId)}`
    : "/knowledge";

  if (!id) {
    return (
      <ConsoleSubpageLayout backHref={documentsHref} backLabel="返回文档列表">
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-slate-500">
          缺少文档 id。请从文档列表进入预览。
        </div>
      </ConsoleSubpageLayout>
    );
  }

  return (
    <ConsoleSubpageLayout
      backHref={documentsHref}
      backLabel="返回文档列表"
      fullHeight
    >
      <DocumentPreviewView id={id} knowledgeBaseId={knowledgeBaseId || undefined} />
    </ConsoleSubpageLayout>
  );
}

export function DocumentPreviewPageClient() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-white/10 px-4 py-8 text-sm text-slate-500">
          正在加载预览…
        </div>
      }
    >
      <DocumentPreviewPageInner />
    </Suspense>
  );
}
