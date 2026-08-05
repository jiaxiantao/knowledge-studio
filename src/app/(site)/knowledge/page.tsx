import type { Metadata } from "next";

import { KnowledgeBaseHub } from "@/components/knowledge-base-hub";
import { ConsoleShell } from "@/components/console-shell";

export const metadata: Metadata = {
  title: "知识管理 | Knowledge Studio",
  description: "管理多个知识库，上传文档并构建向量索引",
};

export default function KnowledgePage() {
  return (
    <ConsoleShell
      title="知识管理"
      description="创建并管理多个知识库，进入后可上传文档、查看切片与索引状态。"
    >
      <KnowledgeBaseHub />
    </ConsoleShell>
  );
}
