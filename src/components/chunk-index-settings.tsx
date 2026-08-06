"use client";

import { useId } from "react";

import {
  CHUNK_STRATEGIES,
  CHUNK_STRATEGY_LABELS,
  DEFAULT_CHUNK_CONFIG,
  type ChunkConfig,
  type ChunkStrategy,
} from "@/lib/chunk-config";

import { cn } from "@/lib/utils";

export function ChunkIndexSettings({
  value,
  onChange,
}: {
  value: ChunkConfig;
  onChange: (next: ChunkConfig) => void;
}) {
  const sliderId = useId();

  function setStrategy(strategy: ChunkStrategy) {
    onChange({ ...value, strategy });
  }

  function setMaxChars(maxChars: number) {
    onChange({
      ...value,
      maxChars,
      overlap: Math.min(value.overlap, Math.floor(maxChars / 2)),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-white">
          <span className="mr-1 text-rose-300">*</span>
          切片方式
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CHUNK_STRATEGIES.map((strategy) => {
            const meta = CHUNK_STRATEGY_LABELS[strategy];
            const active = value.strategy === strategy;
            return (
              <button
                key={strategy}
                type="button"
                onClick={() => setStrategy(strategy)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition",
                  active
                    ? "border-cyan-300/40 bg-cyan-300/10"
                    : "border-white/10 bg-slate-950/40 hover:border-white/20",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      active
                        ? "border-cyan-300 bg-cyan-300"
                        : "border-white/20 bg-transparent",
                    )}
                  >
                    {active ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                    ) : null}
                  </span>
                  <span className="text-sm font-medium text-white">
                    {meta.title}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {meta.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
        <label htmlFor={sliderId} className="text-sm font-medium text-white">
          <span className="mr-1 text-rose-300">*</span>
          最大分段长度
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <input
            id={sliderId}
            type="range"
            min={10}
            max={6000}
            step={10}
            value={value.maxChars}
            onChange={(event) => setMaxChars(Number(event.target.value))}
            className="min-w-48 flex-1 accent-cyan-300"
          />
          <input
            type="number"
            min={10}
            max={6000}
            step={10}
            value={value.maxChars}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) {
                setMaxChars(Math.min(6000, Math.max(10, next)));
              }
            }}
            className="w-24 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm text-white outline-none focus:border-cyan-300/40"
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          范围 10–6000 字符，默认 {DEFAULT_CHUNK_CONFIG.maxChars}（对齐百炼索引设置）
        </p>
      </div>

      {value.strategy === "regex" ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <label className="text-sm font-medium text-white">正则表达式</label>
          <input
            value={value.regex ?? ""}
            onChange={(event) =>
              onChange({ ...value, regex: event.target.value })
            }
            placeholder="例如：\\n#{1,3}\\s"
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
          />
        </div>
      ) : null}

      {value.strategy === "symbol" ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <label className="text-sm font-medium text-white">分隔符号</label>
          <input
            value={value.symbol ?? ""}
            onChange={(event) =>
              onChange({ ...value, symbol: event.target.value })
            }
            placeholder="例如：--- 或 \\n\\n"
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
          />
          <p className="mt-2 text-xs text-slate-500">
            支持 \\n 表示换行；留空则按双换行分段
          </p>
        </div>
      ) : null}
    </div>
  );
}
