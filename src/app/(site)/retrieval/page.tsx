import type { Metadata } from "next";

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
      description="按知识库进入检索工作台，调试 topK 召回与切片相关性。"
    >
      <ServiceEntryList kind="retrieval" modelLabel={modelLabel} />
    </ConsoleShell>
  );
}
