import type { Metadata } from "next";

import { ConsoleShell } from "@/components/console-shell";
import { RetrievalEvalPageClient } from "@/components/retrieval/retrieval-eval-page-client";

export const metadata: Metadata = {
  title: "检索评测 | Knowledge Studio",
  description: "固定评测集跑 Hit@K / MRR，并说明混合检索融合方式",
};

export default function RetrievalEvalPage() {
  return (
    <ConsoleShell hideHeader>
      <RetrievalEvalPageClient />
    </ConsoleShell>
  );
}