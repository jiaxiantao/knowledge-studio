import { LiveHealthPill } from "@/components/live-health-pill";
import { BorderGlow } from "@/components/reactbits/border-glow";
import { getLlmLabel, isLlmConfigured } from "@/lib/llm-config";

export function SystemRuntimeStrip() {
  const llmConfigured = isLlmConfigured();
  let llmLabel = "LLM 未配置";

  if (llmConfigured) {
    try {
      llmLabel = getLlmLabel();
    } catch {
      llmLabel = "LLM 配置异常";
    }
  }

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      <BorderGlow
        className="rounded-2xl"
        glowColor={llmConfigured ? "rgba(103, 232, 249, 0.22)" : "rgba(251, 191, 36, 0.22)"}
      >
        <div
          className={`inline-flex flex-col justify-center rounded-2xl border px-4 py-3 ${
            llmConfigured
              ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
              : "border-amber-400/30 bg-amber-400/10 text-amber-100"
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">
            LLM Runtime
          </span>
          <span className="mt-0.5 font-mono text-[10px] opacity-90">{llmLabel}</span>
        </div>
      </BorderGlow>
      <LiveHealthPill />
    </div>
  );
}
