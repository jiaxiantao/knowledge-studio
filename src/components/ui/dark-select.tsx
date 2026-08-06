"use client";

import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

type DarkSelectOption = {
  value: string;
  label: string;
};

type DarkSelectProps = {
  value: string;
  options: DarkSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  renderOptionActions?: (
    option: DarkSelectOption,
    helpers: { close: () => void },
  ) => ReactNode;
};

export function DarkSelect({
  value,
  options,
  onChange,
  placeholder = "请选择",
  className = "",
  disabled = false,
  renderOptionActions,
}: DarkSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-left text-sm text-slate-100 transition hover:border-white/20 hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className={`min-w-0 flex-1 truncate ${selected ? "text-slate-100" : "text-slate-500"}`}
          title={selected?.label}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1.5 max-h-60 w-full min-w-full overflow-auto rounded-xl border border-white/10 bg-slate-950 py-1 shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          {options.length ? (
            options.map((option) => {
              const isSelected = option.value === value;
              const actions = renderOptionActions?.(option, {
                close: () => setOpen(false),
              });
              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <div
                    className={`flex w-full items-center gap-1 px-1.5 py-0.5 ${
                      isSelected ? "bg-cyan-300/10" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={`flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                        isSelected
                          ? "text-cyan-100"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="truncate" title={option.label}>
                        {option.label}
                      </span>
                      {isSelected && !actions ? (
                        <Check className="h-3.5 w-3.5 shrink-0" />
                      ) : null}
                    </button>
                    {actions ? (
                      <div className="relative z-10 flex shrink-0 items-center gap-0.5 pr-1">
                        {actions}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })
          ) : (
            <li className="px-3 py-2 text-sm text-slate-500">暂无选项</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
