import type { ChatSession } from "@/lib/chat-types";
import {
  createChatSessionRemote,
  fetchChatSessions,
  replaceChatSessionsRemote,
} from "@/lib/chat-sessions-api";
import {
  createEmptySession,
  isLegacySessionsMigrated,
  loadActiveSessionId,
  loadLegacyLocalSessions,
  markLegacySessionsMigrated,
  normalizeChatSession,
  saveActiveSessionId,
  sortChatSessions,
} from "@/lib/chat-sessions";

export type ChatSessionBootstrap = {
  sessions: ChatSession[];
  activeSessionId: string;
};

function resolveActiveSessionId(
  sessions: ChatSession[],
  knowledgeBaseId: string,
) {
  const saved = loadActiveSessionId(knowledgeBaseId);
  if (saved && sessions.some((session) => session.id === saved)) {
    return saved;
  }
  return sessions[0]?.id ?? "";
}

/**
 * Load sessions for a knowledge base. Migrates legacy localStorage data once.
 */
export async function loadChatSessionBootstrap(
  knowledgeBaseId: string,
): Promise<ChatSessionBootstrap> {
  let sessions = await fetchChatSessions(knowledgeBaseId);

  if (!sessions.length && !isLegacySessionsMigrated()) {
    const legacy = loadLegacyLocalSessions()
      .filter((session) => session.branches?.length)
      .map((session) => ({
        ...normalizeChatSession(session),
        knowledgeBaseId,
      }));

    if (legacy.length) {
      sessions = await replaceChatSessionsRemote(legacy);
      markLegacySessionsMigrated();
    }
  } else if (!isLegacySessionsMigrated()) {
    markLegacySessionsMigrated();
  }

  if (!sessions.length) {
    const fresh = await createChatSessionRemote(
      createEmptySession("新对话", knowledgeBaseId),
    );
    sessions = [fresh];
  }

  const activeSessionId = resolveActiveSessionId(sessions, knowledgeBaseId);
  saveActiveSessionId(activeSessionId, knowledgeBaseId);

  return {
    sessions: sortChatSessions(sessions.map(normalizeChatSession)),
    activeSessionId,
  };
}
