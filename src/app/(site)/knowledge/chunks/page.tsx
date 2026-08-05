import type { Metadata } from "next";

import { ConsoleShell } from "@/components/console-shell";
import { DocumentChunksPageClient } from "@/components/document-chunks-page-client";

export const metadata: Metadata = {
  title: "切片详情 | Knowledge Studio",
};

export default function DocumentChunksPage() {
  return (
    <ConsoleShell hideHeader>
      <DocumentChunksPageClient />
    </ConsoleShell>
  );
}
