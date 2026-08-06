"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChatComposer } from "@/components/assistant/chat-composer";
import { ChatMessageBubble } from "@/components/assistant/chat-message";
import { ChatSessionSidebar } from "@/components/assistant/chat-session-sidebar";
import { SuggestedQuestions } from "@/components/assistant/suggested-questions";
import { ConsoleSubpageLayout } from "@/components/console-page-top-bar";
import { KnowledgeBaseMultiSelect } from "@/components/knowledge-base-multi-select";
import { StaticSiteNotice } from "@/components/static-site-notice";
import { showToast } from "@/components/ui/toast";
import { streamChatQuestion, type ChatReference } from "@/lib/chat-stream";
import type { ChatHistoryTurn, ChatMessage, ChatSession } from "@/lib/chat-types";
import { loadChatSessionBootstrap } from "@/lib/chat-session-bootstrap";
import { parseAssistantAnswer } from "@/lib/assistant-answer";
import {
  createChatSessionRemote,
  deleteChatSessionRemote,
  saveChatSessionRemote,
} from "@/lib/chat-sessions-api";
import {
  createEmptySession,
  deriveSessionTitle,
  buildSessionShareUrl,
  findUnusedChatSession,
  getActiveBranch,
  isSessionRenamed,
  loadPinnedSessionIds,
  markSessionRenamed,
  removePinnedSessionId,
  removeRenamedSessionId,
  saveActiveSessionId,
  sortChatSessions,
  togglePinnedSessionId,
  updateSessionBranch,
} from "@/lib/chat-sessions";
import { isStaticSite } from "@/lib/site-mode";
import { buildFallbackSessionTitle } from "@/lib/session-title";

const CHAT_KB_SELECTION_PREFIX = "ks.chat.kbSelection.";

function loadSelectedKnowledgeBaseIds(primaryId: string): string[] {
  if (typeof window === "undefined") {
    return [primaryId];
  }
  try {
    const raw = window.sessionStorage.getItem(
      `${CHAT_KB_SELECTION_PREFIX}${primaryId}`,
    );
    if (!raw) {
      return [primaryId];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [primaryId];
    }
    const ids = parsed.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
    if (!ids.includes(primaryId)) {
      return [primaryId, ...ids];
    }
    return ids.length ? ids : [primaryId];
  } catch {
    return [primaryId];
  }
}

function saveSelectedKnowledgeBaseIds(primaryId: string, ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(
      `${CHAT_KB_SELECTION_PREFIX}${primaryId}`,
      JSON.stringify(ids),
    );
  } catch {
    // ignore quota / private mode
  }
}

function createMessage(
  role: ChatMessage["role"],
  content: string,
  extra: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: `msg-${crypto.randomUUID()}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

async function fetchFollowUpSuggestions(question: string, answer: string) {
  const response = await fetch("/api/chat/suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, answer }),
  });

  if (!response.ok) {
    return [] as string[];
  }

  const payload = (await response.json()) as { suggestions?: string[] };
  return Array.isArray(payload.suggestions) ? payload.suggestions : [];
}

async function fetchSessionTitle(question: string, answer: string) {
  const response = await fetch("/api/chat/title", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, answer }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { title?: string };
  const title = payload.title?.trim();
  return title || null;
}

function latestCompletedPair(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 1; index -= 1) {
    const assistant = messages[index];
    const user = messages[index - 1];

    if (
      assistant?.role === "assistant" &&
      assistant.status === "complete" &&
      user?.role === "user"
    ) {
      return { question: user.content, answer: assistant.content };
    }
  }

  return null;
}

function buildChatHistory(messages: ChatMessage[]): ChatHistoryTurn[] {
  return messages
    .filter((message) => {
      if (message.role === "user") {
        return Boolean(message.content.trim());
      }
      return (
        message.role === "assistant" &&
        message.status !== "streaming" &&
        message.status !== "error" &&
        Boolean(message.content.trim())
      );
    })
    .slice(-6)
    .map((message) => {
      if (message.role === "assistant") {
        const parsed = parseAssistantAnswer(message.content);
        return {
          role: "assistant" as const,
          content: parsed.conclusion || message.content,
        };
      }
      return {
        role: "user" as const,
        content: message.content,
      };
    });
}

export function AssistantChat({
  initialQuestion = "",
  autoRun = false,
  knowledgeBaseId,
}: {
  initialQuestion?: string;
  autoRun?: boolean;
  llmLabel?: string;
  knowledgeBaseId?: string;
}) {
  const hasAutoRun = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const suggestionRequestId = useRef(0);
  const sessionsRef = useRef<ChatSession[]>([]);
  const persistTimers = useRef<Map<string, number>>(new Map());
  /** Locked titles (AI / manual) that must not be overwritten by deriveSessionTitle. */
  const lockedTitlesRef = useRef<Map<string, string>>(new Map());

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [ready, setReady] = useState(() => isStaticSite());
  const [composer, setComposer] = useState(initialQuestion);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedKnowledgeBaseIds, setSelectedKnowledgeBaseIds] = useState<
    string[]
  >(() => (knowledgeBaseId ? [knowledgeBaseId] : []));
  const [pinnedSessionIds, setPinnedSessionIds] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : loadPinnedSessionIds(),
  );

  const staticSite = isStaticSite();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!knowledgeBaseId) {
        setSelectedKnowledgeBaseIds([]);
        return;
      }
      setSelectedKnowledgeBaseIds(loadSelectedKnowledgeBaseIds(knowledgeBaseId));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [knowledgeBaseId]);

  useEffect(() => {
    if (!knowledgeBaseId || !selectedKnowledgeBaseIds.length) {
      return;
    }
    saveSelectedKnowledgeBaseIds(knowledgeBaseId, selectedKnowledgeBaseIds);
  }, [knowledgeBaseId, selectedKnowledgeBaseIds]);

  useEffect(() => {
    if (staticSite || !knowledgeBaseId) {
      if (!knowledgeBaseId && !staticSite) {
        const timer = window.setTimeout(() => {
          setReady(true);
        }, 0);
        return () => window.clearTimeout(timer);
      }
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setReady(false);
          setSessions([]);
          setActiveSessionId("");
          setError(null);

          const bootstrap = await loadChatSessionBootstrap(knowledgeBaseId);

          if (cancelled) {
            return;
          }

          sessionsRef.current = bootstrap.sessions;
          const locked = new Map<string, string>();
          for (const session of bootstrap.sessions) {
            if (!isSessionRenamed(session.id)) {
              continue;
            }
            const derived = deriveSessionTitle(
              getActiveBranch(session).messages,
            );
            // Skip locking raw truncated first-message titles so AI can replace them.
            if (session.title === derived) {
              continue;
            }
            locked.set(session.id, session.title);
          }
          lockedTitlesRef.current = locked;
          setSessions(bootstrap.sessions);
          setPinnedSessionIds(loadPinnedSessionIds());
          setActiveSessionId(bootstrap.activeSessionId);
          setLoadError(null);
        } catch (bootstrapError) {
          if (cancelled) {
            return;
          }
          setLoadError(
            bootstrapError instanceof Error
              ? bootstrapError.message
              : "加载会话失败",
          );
        } finally {
          if (!cancelled) {
            setReady(true);
          }
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [knowledgeBaseId, staticSite]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    if (!activeSessionId || !knowledgeBaseId) {
      return;
    }
    saveActiveSessionId(activeSessionId, knowledgeBaseId);
  }, [activeSessionId, knowledgeBaseId]);

  useEffect(() => {
    const timers = persistTimers.current;
    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  useEffect(() => {
    function flushPendingSessions() {
      for (const timer of persistTimers.current.values()) {
        window.clearTimeout(timer);
      }
      persistTimers.current.clear();

      for (const session of sessionsRef.current) {
        void saveChatSessionRemote(session).catch(() => undefined);
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flushPendingSessions();
      }
    }

    window.addEventListener("pagehide", flushPendingSessions);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flushPendingSessions);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
  const sortedSessions = useMemo(
    () => sortChatSessions(sessions, pinnedSessionIds),
    [sessions, pinnedSessionIds],
  );
  const activeBranch = activeSession ? getActiveBranch(activeSession) : null;
  const messages = useMemo(() => activeBranch?.messages ?? [], [activeBranch]);
  const isEmpty = messages.length === 0 && !isSubmitting;

  const suggestedQuestions = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (
        message.role === "assistant" &&
        message.status === "complete" &&
        message.alternatives?.length
      ) {
        return message.alternatives;
      }
    }
    return [] as string[];
  }, [messages]);

  const persistSession = useCallback(
    (session: ChatSession, options: { immediate?: boolean } = {}) => {
      const sessionToSave: ChatSession = {
        ...session,
        knowledgeBaseId: session.knowledgeBaseId ?? knowledgeBaseId ?? null,
      };
      const existing = persistTimers.current.get(session.id);
      if (existing) {
        window.clearTimeout(existing);
        persistTimers.current.delete(session.id);
      }

      const run = async () => {
        try {
          const saved = await saveChatSessionRemote(sessionToSave);
          setSessions((current) => {
            const next = sortChatSessions(
              current.map((item) => (item.id === saved.id ? saved : item)),
              pinnedSessionIds,
            );
            sessionsRef.current = next;
            return next;
          });
        } catch (persistError) {
          setError(
            persistError instanceof Error
              ? persistError.message
              : "保存会话失败",
          );
        }
      };

      if (options.immediate) {
        void run();
        return;
      }

      const timer = window.setTimeout(() => {
        persistTimers.current.delete(session.id);
        void run();
      }, 450);

      persistTimers.current.set(session.id, timer);
    },
    [knowledgeBaseId, pinnedSessionIds],
  );

  const patchActiveBranch = useCallback(
    (
      updater: (messages: ChatMessage[]) => ChatMessage[],
      options: { persist?: boolean; immediate?: boolean } = {},
    ) => {
      const shouldPersist = options.persist ?? true;

      setSessions((allSessions) => {
        const nextSessions = allSessions.map((session) => {
          if (session.id !== activeSessionId) {
            return session;
          }

          const branch = getActiveBranch(session);
          const updated = updateSessionBranch(session, branch.id, updater);
          const lockedTitle = lockedTitlesRef.current.get(session.id);
          const nextTitle =
            lockedTitle ??
            (isSessionRenamed(session.id)
              ? (sessionsRef.current.find((item) => item.id === session.id)
                  ?.title ?? session.title)
              : deriveSessionTitle(getActiveBranch(updated).messages));

          return {
            ...updated,
            knowledgeBaseId: updated.knowledgeBaseId ?? knowledgeBaseId ?? null,
            title: nextTitle,
          };
        });

        sessionsRef.current = nextSessions;

        if (shouldPersist) {
          const updatedSession = nextSessions.find(
            (session) => session.id === activeSessionId,
          );
          if (updatedSession) {
            persistSession(updatedSession, { immediate: options.immediate });
          }
        }

        return sortChatSessions(nextSessions, pinnedSessionIds);
      });
    },
    [activeSessionId, knowledgeBaseId, persistSession, pinnedSessionIds],
  );

  const attachSuggestions = useCallback(
    async (assistantId: string, question: string, answer: string) => {
      const requestId = suggestionRequestId.current + 1;
      suggestionRequestId.current = requestId;
      setIsSuggesting(true);

      try {
        const suggestions = await fetchFollowUpSuggestions(question, answer);
        if (suggestionRequestId.current !== requestId) {
          return;
        }

        patchActiveBranch(
          (current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, alternatives: suggestions }
                : message,
            ),
          { immediate: true },
        );
      } finally {
        if (suggestionRequestId.current === requestId) {
          setIsSuggesting(false);
        }
      }
    },
    [patchActiveBranch],
  );

  const applySessionTitle = useCallback(
    (sessionId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) {
        return;
      }

      lockedTitlesRef.current.set(sessionId, trimmed);
      markSessionRenamed(sessionId);

      const latest = sessionsRef.current.find((item) => item.id === sessionId);
      if (!latest || latest.title === trimmed) {
        return;
      }

      const updated: ChatSession = {
        ...latest,
        title: trimmed,
        updatedAt: new Date().toISOString(),
      };
      const next = sessionsRef.current.map((item) =>
        item.id === sessionId ? updated : item,
      );
      sessionsRef.current = next;
      setSessions(sortChatSessions(next, pinnedSessionIds));
      persistSession(updated, { immediate: true });
    },
    [persistSession, pinnedSessionIds],
  );

  const maybeSummarizeSessionTitle = useCallback(
    async (sessionId: string, question: string, answer: string) => {
      if (staticSite) {
        return;
      }

      const session = sessionsRef.current.find((item) => item.id === sessionId);
      if (!session) {
        return;
      }

      const messages = getActiveBranch(session).messages;
      const userTurns = messages.filter(
        (message) => message.role === "user",
      ).length;
      if (userTurns !== 1) {
        return;
      }

      const derived = deriveSessionTitle(messages);
      const locked = lockedTitlesRef.current.get(sessionId);
      // Skip only when we already have a non-raw locked/manual title.
      if (
        locked &&
        locked !== derived &&
        !locked.startsWith(derived.slice(0, 12))
      ) {
        return;
      }
      if (
        isSessionRenamed(sessionId) &&
        session.title !== derived &&
        session.title.length <= 18 &&
        !session.title.endsWith("...")
      ) {
        // Likely already a good short title.
        lockedTitlesRef.current.set(sessionId, session.title);
        return;
      }

      // Instant heuristic so sidebar updates before LLM returns.
      const fallback = buildFallbackSessionTitle(question);
      applySessionTitle(sessionId, fallback);

      const title = await fetchSessionTitle(question, answer);
      if (!title) {
        return;
      }
      applySessionTitle(sessionId, title);
    },
    [applySessionTitle, staticSite],
  );

  const runStream = useCallback(
    async (
      question: string,
      options: { regenerate?: boolean; replaceLastAssistant?: boolean } = {},
    ) => {
      if (!selectedKnowledgeBaseIds.length) {
        setError("请至少选择一个知识库");
        return;
      }

      setError(null);
      setIsSubmitting(true);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const active = sessionsRef.current.find(
        (session) => session.id === activeSessionId,
      );
      let priorMessages = active ? getActiveBranch(active).messages : [];
      if (options.replaceLastAssistant) {
        const lastAssistantIndex = findLastIndex(
          priorMessages,
          (message) => message.role === "assistant",
        );
        if (lastAssistantIndex >= 0) {
          priorMessages = priorMessages.slice(0, lastAssistantIndex);
        }
      }
      // Drop the trailing user turn that matches this question — it is the current ask.
      if (
        priorMessages.at(-1)?.role === "user" &&
        priorMessages.at(-1)?.content.trim() === question.trim()
      ) {
        priorMessages = priorMessages.slice(0, -1);
      }
      const history = buildChatHistory(priorMessages);

      const assistantMessage = createMessage("assistant", "", {
        status: "streaming",
      });
      const assistantId = assistantMessage.id;

      patchActiveBranch(
        (current) => {
          let base = current;
          if (options.replaceLastAssistant) {
            const lastAssistantIndex = findLastIndex(
              base,
              (message) => message.role === "assistant",
            );
            if (lastAssistantIndex >= 0) {
              base = base.slice(0, lastAssistantIndex);
            }
          }
          return [...base, assistantMessage];
        },
        { persist: false },
      );

      let streamed = "";
      let latestReferences: ChatReference[] = [];
      let metaConfidence: number | undefined;
      let metaConfidenceLabel: string | undefined;

      try {
        await streamChatQuestion(
          question,
          {
            onReferences: (items) => {
              latestReferences = items;
              patchActiveBranch(
                (current) =>
                  current.map((message) =>
                    message.id === assistantId
                      ? { ...message, references: items }
                      : message,
                  ),
                { persist: false },
              );
            },
            onMeta: (meta) => {
              metaConfidence = meta.confidence;
              metaConfidenceLabel = meta.confidenceLabel;
              patchActiveBranch(
                (current) =>
                  current.map((message) =>
                    message.id === assistantId
                      ? {
                          ...message,
                          confidence: meta.confidence,
                          confidenceLabel: meta.confidenceLabel,
                        }
                      : message,
                  ),
                { persist: false },
              );
            },
            onChunk: (text) => {
              streamed += text;
              patchActiveBranch(
                (current) =>
                  current.map((message) =>
                    message.id === assistantId
                      ? { ...message, content: streamed }
                      : message,
                  ),
                { persist: false },
              );
            },
            onError: (message) => {
              throw new Error(message);
            },
          },
          {
            signal: controller.signal,
            regenerate: options.regenerate,
            temperature: options.regenerate ? 0.55 : undefined,
            knowledgeBaseId,
            knowledgeBaseIds: selectedKnowledgeBaseIds,
            history,
          },
        );

        if (!streamed.trim() && !controller.signal.aborted) {
          throw new Error("没有收到流式内容");
        }

        const completed = !controller.signal.aborted;
        patchActiveBranch(
          (current) =>
            current.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content: streamed || "（已停止或无内容返回）",
                    status: completed ? "complete" : "stopped",
                    confidence: metaConfidence,
                    confidenceLabel: metaConfidenceLabel,
                    references: latestReferences,
                    alternatives: undefined,
                  }
                : message,
            ),
          { immediate: true },
        );

        if (completed && streamed.trim()) {
          void attachSuggestions(assistantId, question, streamed);
          void maybeSummarizeSessionTitle(activeSessionId, question, streamed);
        }
      } catch (submissionError) {
        if ((submissionError as { name?: string }).name === "AbortError") {
          patchActiveBranch(
            (current) =>
              current.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      content: streamed || "（生成已停止）",
                      status: "stopped",
                      confidence: metaConfidence,
                      confidenceLabel: metaConfidenceLabel,
                      references: latestReferences,
                    }
                  : message,
              ),
            { immediate: true },
          );
        } else {
          const message =
            submissionError instanceof Error
              ? submissionError.message
              : "问答失败";
          setError(message);
          patchActiveBranch(
            (current) =>
              current.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      content:
                        streamed ||
                        "这次回答没有成功返回。请确认 Ollama 与向量模型已就绪。",
                      status: "error",
                    }
                  : message,
              ),
            { immediate: true },
          );
        }
      } finally {
        setIsSubmitting(false);
        abortRef.current = null;
      }
    },
    [
      activeSessionId,
      attachSuggestions,
      knowledgeBaseId,
      maybeSummarizeSessionTitle,
      patchActiveBranch,
      selectedKnowledgeBaseIds,
    ],
  );

  const submitUserMessage = useCallback(
    async (rawQuestion: string) => {
      const trimmed = rawQuestion.trim();
      if (!trimmed || isSubmitting || isStaticSite() || !ready) {
        return;
      }

      patchActiveBranch(
        (current) => [...current, createMessage("user", trimmed)],
        { persist: false },
      );

      await runStream(trimmed);
    },
    [isSubmitting, patchActiveBranch, ready, runStream],
  );

  useEffect(() => {
    const trimmed = initialQuestion?.trim();

    if (
      !autoRun ||
      !trimmed ||
      hasAutoRun.current ||
      !ready ||
      !activeSession
    ) {
      return;
    }

    hasAutoRun.current = true;
    void submitUserMessage(trimmed);
  }, [autoRun, initialQuestion, activeSession, ready, submitUserMessage]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [messages, isSubmitting, suggestedQuestions]);

  useEffect(() => {
    if (
      !ready ||
      staticSite ||
      isSubmitting ||
      isSuggesting ||
      suggestedQuestions.length
    ) {
      return;
    }

    const pair = latestCompletedPair(messages);
    if (!pair) {
      return;
    }

    const lastAssistant = [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant" && message.status === "complete",
      );

    if (!lastAssistant || lastAssistant.alternatives) {
      return;
    }

    const timer = window.setTimeout(() => {
      void attachSuggestions(lastAssistant.id, pair.question, pair.answer);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    attachSuggestions,
    isSubmitting,
    isSuggesting,
    messages,
    ready,
    staticSite,
    suggestedQuestions.length,
  ]);

  // Recover sessions whose sidebar title is still the raw first-message truncation.
  useEffect(() => {
    if (!ready || staticSite || isSubmitting || !activeSessionId) {
      return;
    }

    const session = sessionsRef.current.find(
      (item) => item.id === activeSessionId,
    );
    if (!session) {
      return;
    }

    const branchMessages = getActiveBranch(session).messages;
    const userMessages = branchMessages.filter(
      (message) => message.role === "user",
    );
    if (userMessages.length !== 1) {
      return;
    }

    const assistant = [...branchMessages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant" && message.status === "complete",
      );
    if (!assistant?.content.trim()) {
      return;
    }

    const derived = deriveSessionTitle(branchMessages);
    if (session.title !== derived) {
      return;
    }

    const timer = window.setTimeout(() => {
      void maybeSummarizeSessionTitle(
        session.id,
        userMessages[0].content,
        assistant.content,
      );
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    activeSessionId,
    isSubmitting,
    maybeSummarizeSessionTitle,
    messages,
    ready,
    staticSite,
  ]);

  async function handleCreateSession() {
    const existingUnused = findUnusedChatSession(sessionsRef.current);
    if (existingUnused) {
      setActiveSessionId(existingUnused.id);
      setComposer("");
      setError(null);
      showToast("已有未开始的新对话", "success");
      return;
    }

    try {
      const fresh = await createChatSessionRemote(
        createEmptySession("新对话", knowledgeBaseId),
      );
      const next = sortChatSessions(
        [fresh, ...sessionsRef.current],
        pinnedSessionIds,
      );
      sessionsRef.current = next;
      setSessions(next);
      setActiveSessionId(fresh.id);
      setComposer("");
      setError(null);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "新建会话失败",
      );
    }
  }

  async function handleDeleteSession(sessionId: string) {
    try {
      await deleteChatSessionRemote(sessionId);
      removePinnedSessionId(sessionId);
      removeRenamedSessionId(sessionId);
      setPinnedSessionIds(loadPinnedSessionIds());
      let next = sessionsRef.current.filter(
        (session) => session.id !== sessionId,
      );

      if (!next.length) {
        const fresh = await createChatSessionRemote(
        createEmptySession("新对话", knowledgeBaseId),
      );
        next = [fresh];
      }

      sessionsRef.current = next;
      setSessions(sortChatSessions(next, pinnedSessionIds));
      if (sessionId === activeSessionId || !next.some((s) => s.id === activeSessionId)) {
        setActiveSessionId(next[0]?.id ?? "");
        setComposer("");
        setError(null);
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "删除会话失败",
      );
    }
  }

  async function handleRenameSession(sessionId: string, title: string) {
    const target = sessionsRef.current.find((session) => session.id === sessionId);
    if (!target) {
      return;
    }

    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    lockedTitlesRef.current.set(sessionId, trimmed);
    markSessionRenamed(sessionId);

    const updated: ChatSession = {
      ...target,
      title: trimmed,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveChatSessionRemote(updated);
      const next = sessionsRef.current.map((session) =>
        session.id === sessionId ? updated : session,
      );
      sessionsRef.current = next;
      setSessions(sortChatSessions(next, pinnedSessionIds));
    } catch (renameError) {
      setError(
        renameError instanceof Error ? renameError.message : "重命名失败",
      );
    }
  }

  function handleTogglePinSession(sessionId: string) {
    const nextPinned = togglePinnedSessionId(sessionId);
    setPinnedSessionIds(nextPinned);
  }

  async function handlePrepareShare(sessionId: string) {
    const existingTimer = persistTimers.current.get(sessionId);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      persistTimers.current.delete(sessionId);
    }

    const target = sessionsRef.current.find((session) => session.id === sessionId);
    if (!target) {
      throw new Error("会话不存在");
    }

    const branch = getActiveBranch(target);
    if (!branch.messages.length) {
      throw new Error("当前对话暂无内容，无法分享");
    }

    await saveChatSessionRemote(target);
    return buildSessionShareUrl(sessionId);
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  if (!knowledgeBaseId) {
    return (
      <ConsoleSubpageLayout backHref="/assistant" backLabel="返回问答列表" fullHeight>
        <div className="flex h-full min-h-0 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-950/40 px-5 py-16 text-center text-sm text-slate-400">
          请先从{" "}
          <Link href="/assistant" className="text-cyan-200 hover:text-white">
            知识问答列表
          </Link>{" "}
          选择要使用的知识库。
        </div>
      </ConsoleSubpageLayout>
    );
  }

  if (!ready) {
    return (
      <ConsoleSubpageLayout backHref="/assistant" backLabel="返回问答列表" fullHeight>
        <div className="flex h-full min-h-0 items-center justify-center rounded-3xl border border-white/10 bg-slate-950/40 px-5 py-16 text-center text-sm text-slate-500">
          加载会话…
        </div>
      </ConsoleSubpageLayout>
    );
  }

  if (loadError) {
    return (
      <ConsoleSubpageLayout backHref="/assistant" backLabel="返回问答列表" fullHeight>
        <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 px-5 py-10 text-center text-sm text-rose-100">
          {loadError}
          <p className="mt-2 text-xs text-rose-100/70">
            请确认 PostgreSQL 已启动，并执行过 `pnpm db:setup`。
          </p>
        </div>
      </ConsoleSubpageLayout>
    );
  }

  return (
    <ConsoleSubpageLayout backHref="/assistant" backLabel="返回问答列表" fullHeight>
      <div className="grid h-full min-h-0 items-stretch gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <ChatSessionSidebar
        sessions={sortedSessions}
        activeSessionId={activeSessionId}
        onSelect={(sessionId) => {
          setActiveSessionId(sessionId);
          setError(null);
        }}
        onCreate={() => {
          void handleCreateSession();
        }}
        onRename={(sessionId, title) => {
          void handleRenameSession(sessionId, title);
        }}
        onTogglePin={handleTogglePinSession}
        onPrepareShare={async (session) => handlePrepareShare(session.id)}
        onDelete={(sessionId) => {
          void handleDeleteSession(sessionId);
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-slate-950/40">
        <div className="shrink-0 border-b border-white/10 px-4 py-2.5">
          <KnowledgeBaseMultiSelect
            variant="toolbar"
            selectedIds={selectedKnowledgeBaseIds}
            onChange={(ids) => {
              if (!ids.length && knowledgeBaseId) {
                setSelectedKnowledgeBaseIds([knowledgeBaseId]);
                return;
              }
              setSelectedKnowledgeBaseIds(ids);
            }}
          />
        </div>

        {staticSite ? (
          <div className="shrink-0 border-b border-white/10 p-4">
            <StaticSiteNotice feature="知识问答" />
          </div>
        ) : null}

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          {isEmpty ? (
            <div className="flex h-full min-h-[18rem] items-center justify-center">
              <p className="text-sm text-slate-500">输入问题开始问答</p>
            </div>
          ) : (
            <div className="mx-auto grid max-w-3xl gap-5">
              {messages.map((message, index) => (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  isStreaming={
                    isSubmitting &&
                    message.role === "assistant" &&
                    index === messages.length - 1
                  }
                />
              ))}
            </div>
          )}
        </div>

        {error ? (
          <div className="mx-5 mb-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {!staticSite ? (
          <div className="shrink-0 border-t border-white/10 px-5 py-2.5">
            <div className="mx-auto max-w-3xl">
              <SuggestedQuestions
                questions={suggestedQuestions}
                disabled={isSubmitting}
                onSelect={(question) => {
                  setComposer("");
                  void submitUserMessage(question);
                }}
              />

              {isSuggesting && !suggestedQuestions.length ? (
                <p className="mb-1.5 text-[11px] text-slate-600">
                  正在生成推荐追问…
                </p>
              ) : null}

              <ChatComposer
                value={composer}
                onChange={setComposer}
                isSubmitting={isSubmitting}
                onSubmit={() => {
                  const value = composer;
                  setComposer("");
                  void submitUserMessage(value);
                }}
                onStop={handleStop}
              />
            </div>
          </div>
        ) : null}
      </div>
      </div>
    </ConsoleSubpageLayout>
  );
}

function findLastIndex<T>(
  items: T[],
  predicate: (item: T) => boolean,
): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) {
      return index;
    }
  }

  return -1;
}
