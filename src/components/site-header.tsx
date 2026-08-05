import Link from "next/link";

import { SiteHealthBadge } from "@/components/site-health-badge";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <Link
          href="/knowledge"
          className="text-sm font-semibold tracking-[0.24em] text-white transition hover:text-cyan-100"
        >
          KNOWLEDGE STUDIO
        </Link>
        <div className="flex items-center gap-4">
          <SiteHealthBadge />
          <nav className="flex items-center gap-4 text-sm text-slate-300">
            <Link href="/knowledge" className="transition hover:text-white">
              知识管理
            </Link>
            <Link href="/retrieval" className="transition hover:text-white">
              检索
            </Link>
            <Link href="/assistant" className="transition hover:text-white">
              问答
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
