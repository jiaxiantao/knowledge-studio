import Link from "next/link";

import { SiteHealthBadge } from "@/components/site-health-badge";

const navItems = [
  { href: "/knowledge", label: "知识管理" },
  { href: "/retrieval", label: "知识检索" },
  { href: "/assistant", label: "知识问答" },
];

export function ConsoleSidebar({
  activePath,
}: {
  activePath: string;
}) {
  return (
    <aside className="flex w-[14rem] shrink-0 flex-col border-r border-white/10 bg-slate-950/50 px-4 py-6">
      <Link
        href="/knowledge"
        className="flex items-center gap-2.5 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 transition hover:text-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/knowledge-studio-icon.svg"
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 rounded-lg"
        />
        <span className="leading-tight">Knowledge Studio</span>
      </Link>
      <nav className="mt-5 grid gap-1">
        {navItems.map((item) => {
          const active =
            activePath === item.href || activePath.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-cyan-300/15 text-cyan-100"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-2 pt-6">
        <SiteHealthBadge />
      </div>
    </aside>
  );
}
