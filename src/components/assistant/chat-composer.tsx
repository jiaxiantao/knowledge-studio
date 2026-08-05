"use client";

import { Send, Square } from "lucide-react";

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  onStop: () => void;
  placeholder?: string;
};

export function ChatComposer({
  value,
  onChange,
  isSubmitting,
  onSubmit,
  onStop,
  placeholder = "请输入问题",
}: ChatComposerProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent px-2 py-1 text-sm leading-7 text-white outline-none placeholder:text-slate-500"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (!isSubmitting && value.trim()) {
              onSubmit();
            }
          }
        }}
      />
      <div className="mt-2 flex justify-end">
        {isSubmitting ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-300/30 bg-rose-300/10 px-3 py-1.5 text-sm text-rose-100"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            停止
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!value.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-950 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            发送
          </button>
        )}
      </div>
    </div>
  );
}
