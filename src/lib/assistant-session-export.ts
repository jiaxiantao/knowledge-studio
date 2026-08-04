import type { ChatMetrics, ChatSession } from "@/lib/chat-types";
import { buildAssistantContextLinks } from "@/lib/assistant-context-links";
import { analyzeComposer } from "@/lib/front-intelligence";
import type { IntelligencePreferences } from "@/lib/front-intelligence-preferences";
import { getActiveBranch } from "@/lib/chat-sessions";

export type AssistantSessionExport = {
  version: 1;
  exportedAt: string;
  session: {
    id: string;
    title: string;
    updatedAt: string;
  };
  branch: {
    id: string;
    label: string;
    messageCount: number;
    messages: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      createdAt: string;
      confidence?: number;
    }>;
  };
  intelligence: {
    preferences: IntelligencePreferences;
    contextLinks: ReturnType<typeof buildAssistantContextLinks>;
    composerSnapshot: ReturnType<typeof analyzeComposer> | null;
  };
  metrics?: ChatMetrics;
};

export function buildAssistantSessionExport(input: {
  session: ChatSession;
  composer: string;
  preferences: IntelligencePreferences;
  metrics?: ChatMetrics;
}): AssistantSessionExport {
  const branch = getActiveBranch(input.session);
  const messages = branch.messages;
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const composerSnapshot = input.composer.trim()
    ? analyzeComposer(input.composer, messages, input.preferences)
    : lastUser
      ? analyzeComposer(lastUser.content, messages, input.preferences)
      : null;

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    session: {
      id: input.session.id,
      title: input.session.title,
      updatedAt: input.session.updatedAt,
    },
    branch: {
      id: branch.id,
      label: branch.label,
      messageCount: messages.length,
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
        confidence: message.confidence,
      })),
    },
    intelligence: {
      preferences: input.preferences,
      contextLinks: composerSnapshot
        ? buildAssistantContextLinks(composerSnapshot.intents)
        : [],
      composerSnapshot,
    },
    metrics: input.metrics,
  };
}

export function downloadAssistantSessionExport(payload: AssistantSessionExport) {
  const slug = payload.session.title
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]/g, "")
    .slice(0, 40);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `assistant-session-${slug || payload.session.id}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
