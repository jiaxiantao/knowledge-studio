"use client";

import { useRef, useState, type ReactNode } from "react";

type BorderGlowProps = {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  backgroundColor?: string;
};

export function BorderGlow({
  children,
  className = "",
  glowColor = "rgba(103, 232, 249, 0.36)",
  backgroundColor = "rgba(2, 6, 23, 0.36)",
}: BorderGlowProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [opacity, setOpacity] = useState(0);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const element = ref.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    element.style.setProperty("--glow-x", `${event.clientX - rect.left}px`);
    element.style.setProperty("--glow-y", `${event.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setOpacity(1)}
      onPointerLeave={() => setOpacity(0)}
      className={`relative overflow-hidden ${className}`}
      style={{ background: backgroundColor }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] p-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(240px circle at var(--glow-x, 50%) var(--glow-y, 50%), ${glowColor}, transparent 55%)`,
        }}
      >
        <div className="h-full w-full rounded-[inherit] bg-slate-950/88" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
