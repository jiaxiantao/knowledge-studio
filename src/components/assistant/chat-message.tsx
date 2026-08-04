"use client";

import Link from "next/link";
import {
  GitBranch,
  Pencil,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { AssistantMarkdown } from "@/components/assistant/assistant-markdown";
import type { ChatMessage } from "@/lib/chat-types";

type ChatMessageProps = {
  message: ChatMessage;
  isStreaming: boolean;
  onEdit?: (content: string) => void;
  onRegenerate?: () => void;
  onBranch?: () => void;
  onUseAlternative?: (prompt: string) => void;
};

export function ChatMessageBubble({
  message,
  isStreaming,
  onEdit,
  onRegenerate,
  onBranch,
  onUseAlternative,
}: ChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const isUser = message.role === "user";
  const confidence = message.confidence;

  return (
    <article
      className={`rounded-[1.5rem] border p-5 ${
        isUser
          ? "border-white/10 bg-white/5"
          : "border-cyan-300/20 bg-cyan-300/10"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
          {isUser ? "You" : "Assistant"}
          {isStreaming ? " · streaming" : null}
          {message.status === "stopped" ? " · stopped" : null}
        </p>

        {!isUser && confidence != null ? (
          <ConfidenceBadge value={confidence} />
        ) : null}
      </div>

      {message.images?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {message.images.map((image) => (
            <figure
              key={image.name}
              className="overflow-hidden rounded-lg border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.dataUrl}
                alt={image.name}
                className="h-16 w-16 object-cover"
              />
            </figure>
          ))}
        </div>
      ) : null}

      <div className="mt-3">
        {isEditing && isUser ? (
          <div className="grid gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onEdit?.(draft.trim());
                  setIsEditing(false);
                }}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-950"
              >
                保存并重发
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(message.content);
                  setIsEditing(false);
                }}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300"
              >
                取消
              </button>
            </div>
          </div>
        ) : isUser ? (
          <p className="text-sm leading-8 whitespace-pre-wrap text-slate-200">
            {message.content}
          </p>
        ) : (
          <AssistantMarkdown
            content={message.content}
            streaming={isStreaming && !message.content}
          />
        )}
      </div>

      {!isUser && message.alternatives?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {message.alternatives.map((alt) => (
            <button
              key={alt}
              type="button"
              onClick={() => onUseAlternative?.(alt)}
              className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1.5 text-left text-xs text-slate-300 transition hover:border-cyan-300/30 hover:text-white"
            >
              {alt}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {isUser && onEdit ? (
          <ActionButton icon={Pencil} label="编辑" onClick={() => setIsEditing(true)} />
        ) : null}
        {!isUser && onRegenerate ? (
          <ActionButton icon={RefreshCw} label="重新生成" onClick={onRegenerate} />
        ) : null}
        {onBranch ? (
          <ActionButton icon={GitBranch} label="从此分支" onClick={onBranch} />
        ) : null}
      </div>
    </article>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  const high = value >= 0.72;
  const mid = value >= 0.45 && value < 0.72;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] ${
        high
          ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
          : mid
            ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
            : "border-rose-300/30 bg-rose-300/10 text-rose-100"
      }`}
    >
      {high ? (
        <ShieldCheck className="h-3 w-3" />
      ) : (
        <ShieldAlert className="h-3 w-3" />
      )}
      置信度 {percent}%
    </span>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white"
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

export function ReferenceCard({
  reference,
}: {
  reference: {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    score?: number;
    similarity?: number;
  };
}) {
  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{reference.title}</h3>
        {reference.score != null ? (
          <span className="font-mono text-[10px] text-cyan-200">
            score {reference.score}
          </span>
        ) : null}
      </div>
      {reference.summary ? (
        <p className="mt-3 text-sm leading-7 text-slate-300">{reference.summary}</p>
      ) : null}
      <Link
        href={`/notes/${reference.slug}`}
        className="mt-5 inline-flex text-sm font-semibold text-cyan-200 transition hover:text-white"
      >
        打开来源笔记
      </Link>
    </article>
  );
}
