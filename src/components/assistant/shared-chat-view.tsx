"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ChatMessageBubble } from "@/components/assistant/chat-message";
import { StaticSiteNotice } from "@/components/static-site-notice";
import { withBasePath } from "@/lib/app-url";
import type { ChatSession } from "@/lib/chat-types";
import { getShareableMessages } from "@/lib/chat-sessions";
import { isStaticSite } from "@/lib/site-mode";

export function SharedChatView({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !isStaticSite());
  const staticSite = isStaticSite();

  useEffect(() => {
    if (staticSite || !sessionId) {
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/chat/sessions/${sessionId}`, {
            cache: "no-store",
          });
          const payload = (await response.json()) as {
            session?: ChatSession;
            error?: string;
          };

          if (!response.ok) {
            throw new Error(payload.error ?? "加载对话失败");
          }

          if (!cancelled) {
            setSession(payload.session ?? null);
          }
        } catch (loadError) {
          if (!cancelled) {
            setError(
              loadError instanceof Error ? loadError.message : "加载对话失败",
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sessionId, staticSite]);

  const messages = useMemo(
    () => (session ? getShareableMessages(session) : []),
    [session],
  );

  if (staticSite) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <StaticSiteNotice feature="分享对话" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        正在加载对话…
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-sm text-rose-200">
        {error ?? "对话不存在或已被删除"}
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-sm text-slate-500">
        该对话暂无内容
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="grid gap-5">
          {messages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              isStreaming={false}
            />
          ))}
        </div>

        <div className="mt-12 flex justify-center pb-8">
          <Link
            href={withBasePath("/assistant")}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-slate-200 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-white"
          >
            <span className="font-medium tracking-wide text-cyan-200">
              前往 KNOWLEDGE STUDIO
            </span>
            <span className="ml-1">进行问答</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
