"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { buildAssistantContextLinks } from "@/lib/assistant-context-links";
import type { ComposerIntelligence } from "@/lib/front-intelligence";

export function AssistantContextLinks({
  intelligence,
}: {
  intelligence: ComposerIntelligence;
}) {
  const links = buildAssistantContextLinks(intelligence.intents);
  if (!links.length) {
    return null;
  }

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/50 p-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        相关工程能力
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {links.map((link) =>
          link.href.startsWith("http") ? (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:border-cyan-300/30 hover:text-white"
            >
              {link.label}
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:border-cyan-300/30 hover:text-white"
            >
              {link.label}
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
