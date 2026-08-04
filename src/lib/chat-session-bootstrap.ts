import type { ChatSession } from "@/lib/chat-types";
import { createEmptySession, loadSessions, saveSessions } from "@/lib/chat-sessions";

export type ChatSessionBootstrap = {
  sessions: ChatSession[];
  activeSessionId: string;
};

let cachedBootstrap: ChatSessionBootstrap | null = null;

export function getChatSessionBootstrap(): ChatSessionBootstrap {
  if (cachedBootstrap) {
    return cachedBootstrap;
  }

  const loaded = loadSessions();

  if (loaded.length) {
    cachedBootstrap = {
      sessions: loaded,
      activeSessionId: loaded[0].id,
    };
    return cachedBootstrap;
  }

  const fresh = createEmptySession();
  saveSessions([fresh]);
  cachedBootstrap = {
    sessions: [fresh],
    activeSessionId: fresh.id,
  };
  return cachedBootstrap;
}

export function resetChatSessionBootstrapCache() {
  cachedBootstrap = null;
}
