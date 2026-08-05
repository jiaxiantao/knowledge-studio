import type { Metadata } from "next";

import { ConsoleShell } from "@/components/console-shell";
import { KnowledgeDocumentsPageClient } from "@/components/knowledge-documents-page-client";

export const metadata: Metadata = {
  title: "知识库文档 | Knowledge Studio",
  description: "查看知识库中的文档与切片索引状态",
};

export default function KnowledgeDocumentsPage() {
  return (
    <ConsoleShell hideHeader>
      <KnowledgeDocumentsPageClient />
    </ConsoleShell>
  );
}
