"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { ConsoleSubpageLayout } from "@/components/console-page-top-bar";
import { DocumentUploadForm } from "@/components/document-upload-form";

function KnowledgeUploadPageInner() {
  const searchParams = useSearchParams();
  const knowledgeBaseId = searchParams.get("kb")?.trim() || "";

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
    <ConsoleSubpageLayout
      backHref={`/knowledge/documents?kb=${encodeURIComponent(knowledgeBaseId)}`}
      backLabel="返回文档列表"
    >
      <DocumentUploadForm knowledgeBaseId={knowledgeBaseId} />
    </ConsoleSubpageLayout>
  );
}

export function KnowledgeUploadPageClient() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-white/10 px-4 py-8 text-sm text-slate-500">
          正在加载上传页…
        </div>
      }
    >
      <KnowledgeUploadPageInner />
    </Suspense>
  );
}
