"use client";

import type { CSSProperties, ReactNode } from "react";

type StarBorderProps = {
  children: ReactNode;
  className?: string;
  color?: string;
  speed?: CSSProperties["animationDuration"];
  thickness?: number;
};

export function StarBorder({
  children,
  className = "",
  color = "rgba(103, 232, 249, 0.9)",
  speed = "6s",
  thickness = 1,
}: StarBorderProps) {
  return (
    <div
      className={`relative inline-block overflow-hidden rounded-[20px] ${className}`}
      style={{ padding: `${thickness}px` }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-11px] right-[-250%] z-0 h-[50%] w-[300%] rounded-full opacity-70 animate-star-movement-bottom"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-10px] left-[-250%] z-0 h-[50%] w-[300%] rounded-full opacity-70 animate-star-movement-top"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <div className="relative z-10 rounded-[inherit]">{children}</div>
    </div>
  );
}
