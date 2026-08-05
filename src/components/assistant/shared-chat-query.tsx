"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { SharedChatView } from "@/components/assistant/shared-chat-view";

function SharedChatQueryInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id")?.trim() ?? "";

  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-sm text-slate-500">
        缺少对话 ID
      </div>
    );
  }

  return <SharedChatView sessionId={sessionId} />;
}

export function SharedChatQueryView() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          正在加载对话…
        </div>
      }
    >
      <SharedChatQueryInner />
    </Suspense>
  );
}
