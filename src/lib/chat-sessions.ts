import type { ChatBranch, ChatMessage, ChatSession } from "@/lib/chat-types";

const STORAGE_KEY = "ai-my-home.chat-sessions.v1";

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

export function createEmptySession(title = "新对话"): ChatSession {
  const branch = defaultBranch();

  return {
    id: createId("session"),
    title,
    updatedAt: new Date().toISOString(),
    activeBranchId: branch.id,
    branches: [branch],
  };
}

export function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as ChatSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getActiveBranch(session: ChatSession): ChatBranch {
  return (
    session.branches.find((branch) => branch.id === session.activeBranchId) ??
    session.branches[0]
  );
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
  const forkIndex = active.messages.findIndex((message) => message.id === messageId);

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
