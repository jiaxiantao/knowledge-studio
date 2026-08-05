import type { Metadata } from "next";

import { ConsoleShell } from "@/components/console-shell";
import { RetrievalWorkbenchPageClient } from "@/components/retrieval/retrieval-workbench-page-client";

export const metadata: Metadata = {
  title: "检索工作台 | Knowledge Studio",
  description: "对指定知识库执行向量召回试跑",
};

export default function RetrievalWorkbenchPage() {
  return (
    <ConsoleShell hideHeader>
      <RetrievalWorkbenchPageClient />
    </ConsoleShell>
  );
}
