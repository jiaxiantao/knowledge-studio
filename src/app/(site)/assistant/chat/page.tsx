import type { Metadata } from "next";

import { AssistantChatLoader } from "@/components/assistant-chat-loader";
import { ConsoleShell } from "@/components/console-shell";

export const metadata: Metadata = {
  title: "知识问答 | Knowledge Studio",
  description: "基于指定知识库进行 grounded 问答",
};

export const dynamic = "force-static";

export default function AssistantChatPage() {
  return (
    <ConsoleShell hideHeader>
      <AssistantChatLoader />
    </ConsoleShell>
  );
}
