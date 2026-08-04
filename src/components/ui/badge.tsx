import type React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline";

const variantClass: Record<BadgeVariant, string> = {
  default: "bg-cyan-300/15 text-cyan-100 border-cyan-200/25",
  secondary: "bg-emerald-300/15 text-emerald-100 border-emerald-200/25",
  outline: "bg-transparent text-slate-300 border-white/20",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
