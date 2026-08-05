"use client";

import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

type PaginationBarProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
};

function PageSizeSelect({
  value,
  options,
  onChange,
}: {
  value: number;
  options: readonly number[];
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

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
    <div ref={rootRef} className="relative inline-flex items-center gap-2">
      <span className="whitespace-nowrap text-slate-500">每页</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-w-[4.75rem] items-center justify-between gap-1.5 rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 text-slate-200 transition hover:border-white/20 hover:text-white"
      >
        <span className="tabular-nums">{value} 条</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute bottom-full right-0 z-20 mb-1.5 min-w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950 py-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          {options.map((size) => {
            const selected = size === value;
            return (
              <li key={size} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(size);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm transition ${
                    selected
                      ? "bg-cyan-300/10 text-cyan-100"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="tabular-nums">{size} 条</span>
                  {selected ? <Check className="h-3.5 w-3.5" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const showPager = total > pageSize;

  if (total === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1 text-sm text-slate-400">
      <p>
        第 {from}–{to} 条，共 {total} 条
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange ? (
          <PageSizeSelect
            value={pageSize}
            options={pageSizeOptions}
            onChange={onPageSizeChange}
          />
        ) : null}

        {showPager ? (
          <>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => onPageChange(safePage - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              上一页
            </button>
            <span className="min-w-[4.5rem] text-center tabular-nums text-slate-300">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(safePage + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    items: items.slice(start, start + pageSize),
  };
}
