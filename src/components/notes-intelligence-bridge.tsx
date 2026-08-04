import Link from "next/link";
import { Sparkles } from "lucide-react";

export function NotesIntelligenceBridge({ prompts }: { prompts: string[] }) {
  if (!prompts.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-violet-300/15 bg-violet-300/5 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200/80">
        <Sparkles className="h-3.5 w-3.5" />
        智能追问（笔记增强）
      </p>
      <p className="mt-2 text-xs text-slate-400">
        基于公开笔记标签与标题生成，一键带入 Assistant 做召回问答。
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <Link
            key={prompt}
            href={`/assistant?q=${encodeURIComponent(prompt)}`}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-left text-xs text-slate-300 transition hover:border-violet-300/30 hover:text-white"
          >
            {prompt}
          </Link>
        ))}
      </div>
    </div>
  );
}
