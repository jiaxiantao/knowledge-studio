"use client";

import { usePathname } from "next/navigation";

import { ConsoleSidebar } from "@/components/console-sidebar";

export function SiteConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/knowledge";

  return (
    <div className="flex min-h-screen text-foreground">
      <ConsoleSidebar activePath={pathname} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
