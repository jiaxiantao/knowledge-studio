import type { Metadata } from "next";

import { ConsoleShell } from "@/components/console-shell";
import { KnowledgeUploadPageClient } from "@/components/knowledge-upload-page-client";

export const metadata: Metadata = {
  title: "导入数据 | Knowledge Studio",
  description: "上传文档并配置类目，自动切片写入向量索引",
};

export default function KnowledgeUploadPage() {
  return (
    <ConsoleShell hideHeader>
      <KnowledgeUploadPageClient />
    </ConsoleShell>
  );
}
