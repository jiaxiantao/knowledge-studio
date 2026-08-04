"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { NoteCard } from "@/components/note-card";
import type { NoteRecord } from "@/lib/notes-service";

type CreateFormState = {
  title: string;
  summary: string;
  contentMarkdown: string;
  tags: string;
};

const initialFormState: CreateFormState = {
  title: "",
  summary: "",
  contentMarkdown: "",
  tags: "",
};

type NoteFormErrors = Partial<Record<"title" | "contentMarkdown", string>>;

function parseTags(rawTags: string) {
  return rawTags
    .split(/[，,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function validateCreateForm(formState: CreateFormState): NoteFormErrors {
  const errors: NoteFormErrors = {};

  if (!formState.title.trim()) {
    errors.title = "请先填写标题";
  }

  if (!formState.contentMarkdown.trim()) {
    errors.contentMarkdown = "请先填写正文";
  }

  return errors;
}

export function NoteManager() {
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<NoteFormErrors>({});
  const [formState, setFormState] = useState<CreateFormState>(initialFormState);
  const [loginState, setLoginState] = useState({ username: "", password: "" });
  const { authenticated, loading: authLoading, message, login, logout } = useAuth();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const notesResponse = await fetch("/api/notes", { cache: "no-store" });
        const notesPayload = (await notesResponse.json()) as { notes: NoteRecord[] };

        if (!cancelled) {
          setNotes(notesPayload.notes ?? []);
        }
      } catch {
        if (!cancelled) {
          setError("加载笔记失败");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const parsedTags = useMemo(() => {
    return parseTags(formState.tags);
  }, [formState.tags]);

  async function handleLogin() {
    setError(null);
    try {
      const ok = await login(loginState.username, loginState.password);
      if (!ok) {
        return;
      }
      setLoginState((current) => ({ ...current, password: "" }));
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败");
    }
  }

  async function handleLogout() {
    setError(null);
    try {
      await logout();
    } catch {
      setError("退出登录失败");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authenticated) {
      setError("请先用管理员账号登录");
      return;
    }
    const nextFieldErrors = validateCreateForm(formState);

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setError("请先补全必填字段");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formState.title,
          summary: formState.summary,
          contentMarkdown: formState.contentMarkdown,
          tags: parsedTags,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        note?: NoteRecord;
        details?: {
          fieldErrors?: Partial<Record<"title" | "contentMarkdown", string[]>>;
        };
      };

      if (!response.ok || !payload.note) {
        if (payload.details?.fieldErrors) {
          setFieldErrors({
            title: payload.details.fieldErrors.title?.[0],
            contentMarkdown: payload.details.fieldErrors.contentMarkdown?.[0],
          });
        }
        throw new Error(payload.error ?? "新增笔记失败");
      }

      setNotes((current) => [payload.note!, ...current]);
      setFieldErrors({});
      setFormState(initialFormState);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "新增笔记失败",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!authenticated) {
      setError("删除前请先用管理员账号登录");
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "删除笔记失败");
      }

      setNotes((current) => current.filter((note) => note.id !== id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "删除笔记失败",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <form
        onSubmit={handleSubmit}
        className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-7"
      >
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          添加笔记
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          标题和正文会直接写入 PostgreSQL。仅管理员登录后可新增 / 删除。
        </p>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">管理员鉴权</p>
          {authLoading ? (
            <p className="mt-2 text-sm text-slate-400">正在检查登录状态...</p>
          ) : authenticated ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-sm text-emerald-200">已登录，允许写入数据库</p>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:border-white/20"
              >
                退出登录
              </button>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <input
                value={loginState.username}
                onChange={(event) =>
                  setLoginState((current) => ({ ...current, username: event.target.value }))
                }
                placeholder="管理员账号"
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
              />
              <input
                type="password"
                value={loginState.password}
                onChange={(event) =>
                  setLoginState((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="管理员密码"
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
              />
              <button
                type="button"
                onClick={() => void handleLogin()}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-100"
              >
                登录
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4">
          <Field
            label="标题"
            value={formState.title}
            onChange={(value) =>
              setFormState((current) => ({ ...current, title: value }))
            }
            placeholder="例如：我做前端架构评审时最先看什么"
            error={fieldErrors.title}
            required
          />
          <Field
            label="摘要"
            value={formState.summary}
            onChange={(value) =>
              setFormState((current) => ({ ...current, summary: value }))
            }
            placeholder="这条笔记想记录什么"
          />
          <TextAreaField
            label="正文"
            value={formState.contentMarkdown}
            onChange={(value) =>
              setFormState((current) => ({
                ...current,
                contentMarkdown: value,
              }))
            }
            placeholder="用自然语言或 markdown 写下你的内容"
            error={fieldErrors.contentMarkdown}
            required
          />
          <Field
            label="标签"
            value={formState.tags}
            onChange={(value) =>
              setFormState((current) => ({ ...current, tags: value }))
            }
            placeholder="多个标签用逗号分隔"
          />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : message ? (
          <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
            {message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !authenticated}
          className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {authenticated ? (isSubmitting ? "提交中..." : "新增笔记") : "请先登录管理员"}
        </button>
      </form>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-8 text-sm text-slate-400">
            正在加载笔记...
          </div>
        ) : notes.length ? (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              deletingId={deletingId}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <div className="rounded-[2rem] border border-dashed border-white/15 bg-slate-950/35 p-8 text-sm text-slate-400">
            还没有笔记，先添加第一条。
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-white">
        {label}
        {required ? <span className="ml-1 text-rose-300">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`rounded-2xl border bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 ${
          error ? "border-rose-400/40" : "border-white/10"
        }`}
      />
      {error ? <span className="text-xs text-rose-200">{error}</span> : null}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  error,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-white">
        {label}
        {required ? <span className="ml-1 text-rose-300">*</span> : null}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={8}
        aria-invalid={Boolean(error)}
        className={`rounded-2xl border bg-white/5 px-4 py-3 text-sm leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 ${
          error ? "border-rose-400/40" : "border-white/10"
        }`}
      />
      {error ? <span className="text-xs text-rose-200">{error}</span> : null}
    </label>
  );
}
