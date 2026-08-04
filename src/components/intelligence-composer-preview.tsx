"use client";

import type { ComposerIntelligence } from "@/lib/front-intelligence";
import { formatIntentLabel } from "@/lib/front-intelligence";

export function IntelligenceComposerPreview({
  intelligence,
  onApplyRewrite,
  onAppendAction,
  onSelectFollowUp,
  showFollowUps = true,
}: {
  intelligence: ComposerIntelligence;
  onApplyRewrite?: () => void;
  onAppendAction?: (action: string) => void;
  onSelectFollowUp?: (followUp: string) => void;
  showFollowUps?: boolean;
}) {
  return (
    <div className="space-y-3">
      {intelligence.intents.length ? (
        <div className="flex flex-wrap gap-2">
          {intelligence.intents.map((intent) => (
            <span
              key={intent.label}
              className="rounded-full border border-cyan-200/30 bg-cyan-200/10 px-3 py-1 text-[11px] text-cyan-100"
            >
              {formatIntentLabel(intent.label)} · {Math.round(intent.score * 100)}%
            </span>
          ))}
        </div>
      ) : null}

      {intelligence.rewrittenPrompt && onApplyRewrite ? (
        <button
          type="button"
          onClick={onApplyRewrite}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:border-white/30"
        >
          应用智能改写
        </button>
      ) : null}

      {intelligence.actions.length && onAppendAction ? (
        <div className="flex flex-wrap gap-2">
          {intelligence.actions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => onAppendAction(action)}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:border-white/20"
            >
              + {action}
            </button>
          ))}
        </div>
      ) : null}

      {showFollowUps && intelligence.followUps.length && onSelectFollowUp ? (
        <div className="border-t border-white/10 pt-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            建议继续追问
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {intelligence.followUps.map((follow) => (
              <button
                key={follow}
                type="button"
                onClick={() => onSelectFollowUp(follow)}
                className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100 transition hover:border-emerald-200/40"
              >
                {follow}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
