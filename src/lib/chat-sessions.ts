import type { ChatBranch, ChatMessage, ChatSession } from "@/lib/chat-types";
import { withBasePath } from "@/lib/app-url";

const ACTIVE_SESSION_KEY = "ai-my-home.chat-active-session.v1";
const LEGACY_STORAGE_KEY = "ai-my-home.chat-sessions.v1";
const MIGRATED_FLAG_KEY = "ai-my-home.chat-sessions.migrated-to-db.v1";

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function defaultBranch(): ChatBranch {
  return {
    id: createId("branch"),
    label: "主对话",
    messages: [],
  };
}

export function createEmptySession(
  title = "新对话",
  knowledgeBaseId?: string,
): ChatSession {
  const branch = defaultBranch();
  const now = new Date().toISOString();

  return {
    id: createId("session"),
    knowledgeBaseId: knowledgeBaseId ?? null,
    title,
    createdAt: now,
    updatedAt: now,
    activeBranchId: branch.id,
    branches: [branch],
  };
}

export function loadActiveSessionId(knowledgeBaseId: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(
      `${ACTIVE_SESSION_KEY}.${knowledgeBaseId}`,
    );
  } catch {
    return null;
  }
}

export function saveActiveSessionId(
  sessionId: string,
  knowledgeBaseId: string,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    `${ACTIVE_SESSION_KEY}.${knowledgeBaseId}`,
    sessionId,
  );
}

/** Read legacy localStorage sessions once for DB migration. */
export function loadLegacyLocalSessions(): ChatSession[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as ChatSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isLegacySessionsMigrated(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(MIGRATED_FLAG_KEY) === "1";
  } catch {
    return true;
  }
}

export function markLegacySessionsMigrated() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(MIGRATED_FLAG_KEY, "1");
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getActiveBranch(session: ChatSession): ChatBranch {
  return (
    session.branches.find((branch) => branch.id === session.activeBranchId) ??
    session.branches[0]
  );
}

/** Messages to show on the public share page. */
export function getShareableMessages(session: ChatSession) {
  const active = getActiveBranch(session);
  if (active?.messages.length) {
    return active.messages;
  }

  const richest = [...session.branches].sort(
    (left, right) => right.messages.length - left.messages.length,
  )[0];

  return richest?.messages ?? [];
}

export function updateSessionBranch(
  session: ChatSession,
  branchId: string,
  updater: (messages: ChatMessage[]) => ChatMessage[],
): ChatSession {
  return {
    ...session,
    updatedAt: new Date().toISOString(),
    branches: session.branches.map((branch) =>
      branch.id === branchId
        ? { ...branch, messages: updater(branch.messages) }
        : branch,
    ),
  };
}

export function forkBranchFromMessage(
  session: ChatSession,
  messageId: string,
): ChatSession {
  const active = getActiveBranch(session);
  const forkIndex = active.messages.findIndex(
    (message) => message.id === messageId,
  );

  if (forkIndex === -1) {
    return session;
  }

  const newBranch: ChatBranch = {
    id: createId("branch"),
    label: `分支 · ${active.messages[forkIndex]?.content.slice(0, 12) || "…"}`,
    messages: active.messages.slice(0, forkIndex + 1).map((message) => ({
      ...message,
      id: createId("msg"),
      status: message.status === "streaming" ? "stopped" : message.status,
    })),
    forkedFromMessageId: messageId,
    parentBranchId: active.id,
  };

  return {
    ...session,
    updatedAt: new Date().toISOString(),
    activeBranchId: newBranch.id,
    branches: [...session.branches, newBranch],
  };
}

export function deriveSessionTitle(messages: ChatMessage[]) {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser?.content.trim()) {
    return "新对话";
  }

  return firstUser.content.trim().slice(0, 28);
}

/** Session created but no messages sent yet. */
export function isUnusedChatSession(session: ChatSession) {
  return getActiveBranch(session).messages.length === 0;
}

export function findUnusedChatSession(sessions: ChatSession[]) {
  return sessions.find(isUnusedChatSession) ?? null;
}

const PINNED_SESSIONS_KEY = "ai-my-home.chat-sessions.pinned.v1";
const RENAMED_SESSIONS_KEY = "ai-my-home.chat-sessions.renamed.v1";

function readIdSet(key: string) {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return new Set<string>();
    }
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

function writeIdSet(key: string, ids: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

export function loadPinnedSessionIds() {
  return [...readIdSet(PINNED_SESSIONS_KEY)];
}

export function isSessionPinned(sessionId: string) {
  return readIdSet(PINNED_SESSIONS_KEY).has(sessionId);
}

export function togglePinnedSessionId(sessionId: string) {
  const ids = readIdSet(PINNED_SESSIONS_KEY);
  if (ids.has(sessionId)) {
    ids.delete(sessionId);
  } else {
    ids.add(sessionId);
  }
  writeIdSet(PINNED_SESSIONS_KEY, ids);
  return [...ids];
}

export function removePinnedSessionId(sessionId: string) {
  const ids = readIdSet(PINNED_SESSIONS_KEY);
  ids.delete(sessionId);
  writeIdSet(PINNED_SESSIONS_KEY, ids);
}

export function isSessionRenamed(sessionId: string) {
  return readIdSet(RENAMED_SESSIONS_KEY).has(sessionId);
}

export function markSessionRenamed(sessionId: string) {
  const ids = readIdSet(RENAMED_SESSIONS_KEY);
  ids.add(sessionId);
  writeIdSet(RENAMED_SESSIONS_KEY, ids);
}

export function removeRenamedSessionId(sessionId: string) {
  const ids = readIdSet(RENAMED_SESSIONS_KEY);
  ids.delete(sessionId);
  writeIdSet(RENAMED_SESSIONS_KEY, ids);
}

export function getSessionCreatedTime(session: ChatSession) {
  if (session.createdAt) {
    return new Date(session.createdAt).getTime();
  }

  const branch = getActiveBranch(session);
  if (!branch.messages.length) {
    return new Date(session.updatedAt).getTime();
  }

  return Math.min(
    ...branch.messages.map((message) => new Date(message.createdAt).getTime()),
  );
}

export function normalizeChatSession(session: ChatSession): ChatSession {
  if (session.createdAt) {
    return session;
  }

  return {
    ...session,
    createdAt: new Date(getSessionCreatedTime(session)).toISOString(),
  };
}

export function sortChatSessions(
  sessions: ChatSession[],
  pinnedIds: string[] = loadPinnedSessionIds(),
) {
  const pinned = new Set(pinnedIds);

  return [...sessions].sort((left, right) => {
    const leftPinned = pinned.has(left.id);
    const rightPinned = pinned.has(right.id);
    if (leftPinned !== rightPinned) {
      return leftPinned ? -1 : 1;
    }

    return getSessionCreatedTime(right) - getSessionCreatedTime(left);
  });
}

export function buildSessionShareUrl(sessionId: string, origin?: string) {
  const siteOrigin =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const path = withBasePath(
    `/assistant/share?id=${encodeURIComponent(sessionId)}`,
  );
  return `${siteOrigin}${path}`;
}
