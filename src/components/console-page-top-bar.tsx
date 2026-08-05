"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function ConsolePageTopBar({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center border-b border-white/10">
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        {label}
      </Link>
    </div>
  );
}

export function ConsoleSubpageLayout({
  backHref,
  backLabel,
  children,
  fullHeight = false,
}: {
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
  fullHeight?: boolean;
}) {
  return (
    <div className={fullHeight ? "flex h-full min-h-0 flex-col" : "flex flex-col"}>
      <ConsolePageTopBar href={backHref} label={backLabel} />
      <div className={fullHeight ? "min-h-0 flex-1 pt-4" : "pt-4"}>{children}</div>
    </div>
  );
}
