"use client";

import { useEffect, useState } from "react";
type HealthPayload = {
  db?: { connected?: boolean; ok?: boolean; latencyMs?: number };
  llm?: { configured?: boolean; label?: string };
  search?: { pgTrgm?: boolean };
  release?: { store?: "postgresql" | "memory" | "unavailable" };
};

export function LiveHealthPill() {
  const [status, setStatus] = useState<"loading" | "ok" | "degraded" | "error">(
    "loading",
  );
  const [detail, setDetail] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        const data = (await response.json()) as HealthPayload;

        if (cancelled) {
          return;
        }

        const dbOk = Boolean(data.db?.ok);
        const llmOk = Boolean(data.llm?.configured);
        const trgm = data.search?.pgTrgm ? "pg_trgm" : "memory";
        const release = data.release?.store ?? "—";

        setStatus(dbOk && llmOk ? "ok" : "degraded");
        setDetail(
          [
            data.db?.connected ? `db ${data.db.latencyMs ?? 0}ms` : "db off",
            data.llm?.label,
            trgm,
            `release ${release}`,
          ]
            .filter(Boolean)
            .join(" · "),
        );
      } catch {
        if (!cancelled) {
          setStatus("error");
          setDetail("health unreachable");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const tone =
    status === "ok"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
      : status === "loading"
        ? "border-white/10 bg-white/5 text-slate-400"
        : "border-amber-400/30 bg-amber-400/10 text-amber-100";

  const label =
    status === "loading"
      ? "探测中…"
      : status === "ok"
        ? "系统就绪"
        : status === "degraded"
          ? "部分降级"
          : "健康检查失败";

  return (
    <a
      href="/status"
      className={`inline-flex max-w-full flex-col gap-0.5 rounded-2xl border px-4 py-3 transition hover:brightness-110 ${tone}`}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.18em]">
        {label}
      </span>
      {detail ? (
        <span className="truncate font-mono text-[10px] opacity-90">{detail}</span>
      ) : null}
    </a>
  );
}
