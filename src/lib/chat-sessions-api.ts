import type { ChatSession } from "@/lib/chat-types";
import { apiFetch } from "@/lib/api-fetch";

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `请求失败 (${response.status})`;
  } catch {
    return `请求失败 (${response.status})`;
  }
}

export async function fetchChatSessions(
  knowledgeBaseId: string,
): Promise<ChatSession[]> {
  const response = await apiFetch(
    `/api/chat/sessions?knowledgeBaseId=${encodeURIComponent(knowledgeBaseId)}`,
  );
  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload = (await response.json()) as { sessions?: ChatSession[] };
  return Array.isArray(payload.sessions) ? payload.sessions : [];
}

export async function createChatSessionRemote(
  session: ChatSession,
): Promise<ChatSession> {
  const response = await apiFetch("/api/chat/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload = (await response.json()) as { session: ChatSession };
  return payload.session;
}

export async function saveChatSessionRemote(
  session: ChatSession,
): Promise<ChatSession> {
  const response = await apiFetch(`/api/chat/sessions/${session.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload = (await response.json()) as { session: ChatSession };
  return payload.session;
}

export async function deleteChatSessionRemote(sessionId: string) {
  const response = await apiFetch(`/api/chat/sessions/${sessionId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function replaceChatSessionsRemote(
  sessions: ChatSession[],
): Promise<ChatSession[]> {
  const response = await apiFetch("/api/chat/sessions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessions }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload = (await response.json()) as { sessions?: ChatSession[] };
  return Array.isArray(payload.sessions) ? payload.sessions : [];
}
