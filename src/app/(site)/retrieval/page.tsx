import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical } from "lucide-react";

import { ConsoleShell } from "@/components/console-shell";
import { ServiceEntryList } from "@/components/service-entry-list";
import { getLlmLabel } from "@/lib/llm-config";

export const metadata: Metadata = {
  title: "知识检索 | Knowledge Studio",
  description: "选择知识库检索服务，调试向量召回效果",
};

export default function RetrievalPage() {
  const modelLabel = getLlmLabel();

  return (
    <ConsoleShell
      title="知识检索"
      description="按知识库进入检索工作台；也可用评测集量化 Hit@K / MRR，并复习混合检索融合。"
    >
      <div className="mb-6">
        <Link
          href="/retrieval/eval"
          className="flex items-start gap-3 rounded-2xl border border-cyan-300/25 bg-cyan-400/5 px-4 py-4 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-100">
            <FlaskConical className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">
              评测集 · 融合说明
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              跑默认 golden queries，看 Hit@K / MRR；同一页讲清向量+关键词加权融合。
              改完切分后请先对文档「重新解析」，再评测。
            </span>
          </span>
        </Link>
      </div>
      <ServiceEntryList kind="retrieval" modelLabel={modelLabel} />
    </ConsoleShell>
  );
}
