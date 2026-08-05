import type { Metadata } from "next";

import { SharedChatQueryView } from "@/components/assistant/shared-chat-query";

export const metadata: Metadata = {
  title: "分享的对话",
  description: "只读查看分享的问答对话",
};

export default function SharedChatPage() {
  return <SharedChatQueryView />;
}
