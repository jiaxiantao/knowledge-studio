"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Play } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { ConsoleSubpageLayout } from "@/components/console-page-top-bar";
import { KnowledgeBaseMultiSelect } from "@/components/knowledge-base-multi-select";
import { StaticSiteNotice } from "@/components/static-site-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast, ToastHost } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-fetch";
import type { KnowledgeBaseRecord } from "@/lib/knowledge-base-types";
import { isStaticSite } from "@/lib/site-mode";

function buildCurl(opts: {
  origin: string;
  apiKey: string;
  agentIds: string[];
  question: string;
  stream: boolean;
}) {
  const agentIdValue =
    opts.agentIds.length === 0
      ? "<knowledgeBaseId>"
      : opts.agentIds.length === 1
        ? opts.agentIds[0]
        : opts.agentIds;

  const body = {
    input: {
      agent_id: agentIdValue,
      messages: [{ role: "user", content: opts.question || "" }],
    },
    parameters: { stream: opts.stream },
  };

  return `curl -X POST '${opts.origin}/api/v1/apps/chat' \\
  -H 'Authorization: Bearer ${opts.apiKey || "YOUR_API_KEY"}' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(body, null, 2).replace(/'/g, "'\\''")}'`;
}

export function ApiPlaygroundPageClient() {
  const searchParams = useSearchParams();
  const { user, openAuthDialog } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [agentIds, setAgentIds] = useState<string[]>([]);
  const [question, setQuestion] = useState("知识库里讲了什么？");
  const [stream, setStream] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState("");
  const resultScrollRef = useRef<HTMLDivElement | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  useEffect(() => {
    const el = resultScrollRef.current;
    if (!el || !result) {
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [result]);

  useEffect(() => {
    if (!user) {
      setAgentIds([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await apiFetch("/api/knowledge-bases", {
          cache: "no-store",
        });
        if (!response.ok || cancelled) {
          return;
        }
        const payload = (await response.json()) as {
          knowledgeBases?: KnowledgeBaseRecord[];
        };
        const list = Array.isArray(payload.knowledgeBases)
          ? payload.knowledgeBases
          : [];
        if (cancelled || list.length === 0) {
          return;
        }
        const preset = searchParams.get("kb")?.trim();
        setAgentIds((current) => {
          const stillValid = current.filter((id) =>
            list.some((item) => item.id === id),
          );
          if (stillValid.length > 0) {
            if (
              preset &&
              list.some((item) => item.id === preset) &&
              !stillValid.includes(preset)
            ) {
              return [preset, ...stillValid];
            }
            return stillValid;
          }
          if (preset && list.some((item) => item.id === preset)) {
            return [preset];
          }
          return [list[0]!.id];
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, searchParams]);

  const curl = useMemo(
    () =>
      buildCurl({
        origin,
        apiKey,
        agentIds,
        question,
        stream,
      }),
    [origin, apiKey, agentIds, question, stream],
  );

  async function runRequest() {
    if (!apiKey.trim()) {
      showToast("请填写 API Key", "error");
      return;
    }
    if (agentIds.length === 0) {
      showToast("请至少选择一个知识库（agent_id）", "error");
      return;
    }
    if (!question.trim()) {
      showToast("请输入问题", "error");
      return;
    }

    setRunning(true);
    setResult("");
    try {
      const response = await fetch("/api/v1/apps/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            agent_id: agentIds.length === 1 ? agentIds[0] : agentIds,
            messages: [{ role: "user", content: question.trim() }],
          },
          parameters: { stream },
        }),
      });

      if (stream) {
        if (!response.ok) {
          const text = await response.text();
          setResult(text || `请求失败 (${response.status})`);
          showToast("调用失败", "error");
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setResult("无法读取流式响应体");
          showToast("调用失败", "error");
          return;
        }

        const decoder = new TextDecoder();
        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          accumulated += decoder.decode(value, { stream: true });
          setResult(accumulated);
        }
        accumulated += decoder.decode();
        setResult(accumulated);
        showToast("调用成功", "success");
        return;
      }

      const payload = await response.json();
      setResult(JSON.stringify(payload, null, 2));
      if (!response.ok) {
        showToast(
          typeof payload.error === "string" ? payload.error : "调用失败",
          "error",
        );
      } else {
        showToast("调用成功", "success");
      }
    } catch (error) {
      setResult(error instanceof Error ? error.message : "请求失败");
      showToast("请求失败", "error");
    } finally {
      setRunning(false);
    }
  }

  if (isStaticSite()) {
    return (
      <ConsoleSubpageLayout backHref="/developer/keys" backLabel="API Key">
        <div className="px-6 pb-10">
          <StaticSiteNotice />
        </div>
      </ConsoleSubpageLayout>
    );
  }

  return (
    <>
      <ToastHost />
      <ConsoleSubpageLayout backHref="/developer/keys" backLabel="API Key">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 pb-12 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
            <h1 className="text-xl font-semibold text-white">API 调试</h1>
            <p className="mt-2 text-sm text-slate-400">
              使用 API Key 调用外部问答接口。应用 ID（agent_id）即知识库
              ID，支持多选联合检索。
            </p>

            {!user ? (
              <div className="mt-6 rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center">
                <p className="text-sm text-slate-300">
                  登录后可选择自己的知识库作为 agent_id
                </p>
                <Button
                  type="button"
                  className="mt-3"
                  onClick={() => openAuthDialog()}
                >
                  登录
                </Button>
              </div>
            ) : null}

            <div className="mt-6 grid gap-4">
              <label className="grid gap-1.5 text-sm text-slate-300">
                API Key
                <Input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ks-…"
                  autoComplete="off"
                />
                <Link
                  href="/developer/keys"
                  className="text-xs text-cyan-200 hover:underline"
                >
                  去创建 / 管理 API Key
                </Link>
              </label>

              <div className="grid gap-1.5 text-sm text-slate-300">
                <span>agent_id（知识库，可多选）</span>
                {user ? (
                  <KnowledgeBaseMultiSelect
                    selectedIds={agentIds}
                    onChange={setAgentIds}
                    variant="panel"
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-500">
                    登录后选择知识库
                  </div>
                )}
              </div>

              <label className="grid gap-1.5 text-sm text-slate-300">
                问题
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
                />
              </label>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                <span className="text-sm text-slate-300">流式输出（SSE）</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={stream}
                  onClick={() => setStream((value) => !value)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    stream ? "bg-cyan-300" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                      stream ? "left-[1.375rem]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          <section className="flex flex-col rounded-2xl border border-white/10 bg-slate-950/50 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                调试 Shell
              </h2>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(curl);
                      showToast("已复制 curl", "success");
                    } catch {
                      showToast("复制失败", "error");
                    }
                  }}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  复制
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={running}
                  onClick={() => void runRequest()}
                >
                  <Play className="mr-1 h-3.5 w-3.5" />
                  {running ? "运行中…" : "运行"}
                </Button>
              </div>
            </div>

            <pre className="mt-4 h-48 shrink-0 overflow-auto rounded-xl border border-white/10 bg-black/50 p-3 text-xs leading-5 text-cyan-50/90">
              {curl}
            </pre>

            <div
              ref={resultScrollRef}
              className="mt-4 h-80 shrink-0 overflow-auto scroll-smooth rounded-xl border border-white/10 bg-black/40 p-3"
            >
              {result ? (
                <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-200">
                  {result}
                </pre>
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-slate-500">
                  点击「运行」按钮，立即获得调用结果
                </p>
              )}
            </div>
          </section>
        </div>
      </ConsoleSubpageLayout>
    </>
  );
}
