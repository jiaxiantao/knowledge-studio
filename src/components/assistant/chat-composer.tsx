"use client";

import { Send, Square } from "lucide-react";
import { useEffect, useRef } from "react";

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  onStop: () => void;
  placeholder?: string;
};

const LINE_HEIGHT_PX = 24;
const MAX_ROWS = 3;
const MAX_HEIGHT_PX = LINE_HEIGHT_PX * MAX_ROWS;

export function ChatComposer({
  value,
  onChange,
  isSubmitting,
  onSubmit,
  onStop,
  placeholder = "请输入问题",
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={1}
          placeholder={placeholder}
          className="max-h-[4.5rem] min-h-6 w-full resize-none overflow-y-auto bg-transparent py-1 text-sm leading-6 text-white outline-none placeholder:text-slate-500 [scrollbar-width:thin]"
          style={{ height: `${LINE_HEIGHT_PX}px` }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!isSubmitting && value.trim()) {
                onSubmit();
              }
            }
          }}
        />
        {isSubmitting ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-300/30 bg-rose-300/10 px-3 py-1.5 text-sm text-rose-100"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            停止
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!value.trim()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-950 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            发送
          </button>
        )}
      </div>
    </div>
  );
}
