import type { Metadata } from "next";

import { ConsoleShell } from "@/components/console-shell";
import { ServiceEntryList } from "@/components/service-entry-list";
import { getLlmLabel } from "@/lib/llm-config";

export const metadata: Metadata = {
  title: "知识问答 | Knowledge Studio",
  description: "选择知识库问答服务，基于文档切片进行 grounded 问答",
};

export const dynamic = "force-static";

export default function AssistantPage() {
  const modelLabel = getLlmLabel();

  return (
    <ConsoleShell
      title="知识问答"
      description="按知识库进入问答服务，召回切片后由模型生成回答。"
    >
      <ServiceEntryList kind="assistant" modelLabel={modelLabel} />
    </ConsoleShell>
  );
}
