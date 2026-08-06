import type { Metadata } from "next";

import { ConsoleShell } from "@/components/console-shell";
import { DocumentPreviewPageClient } from "@/components/document-preview-page-client";

export const metadata: Metadata = {
  title: "文档预览 | Knowledge Studio",
};

export default function DocumentPreviewPage() {
  return (
    <ConsoleShell hideHeader>
      <DocumentPreviewPageClient />
    </ConsoleShell>
  );
}
