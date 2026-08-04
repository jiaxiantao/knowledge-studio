"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";

type GlareHoverProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  glareColor?: string;
  glareOpacity?: number;
  glareAngle?: number;
  glareSize?: number;
  transitionDuration?: number;
  borderRadius?: string;
};

function toRgba(color: string, opacity: number) {
  const hex = color.replace("#", "");

  if (/^[\dA-Fa-f]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  if (/^[\dA-Fa-f]{3}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  return color;
}

export function GlareHover({
  children,
  className = "",
  style,
  glareColor = "#ffffff",
  glareOpacity = 0.18,
  glareAngle = -35,
  glareSize = 220,
  transitionDuration = 650,
  borderRadius = "inherit",
}: GlareHoverProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const rgba = toRgba(glareColor, glareOpacity);

  function animateIn() {
    const element = overlayRef.current;
    if (!element) {
      return;
    }

    element.style.transition = "none";
    element.style.backgroundPosition = "-100% -100%, 0 0";
    element.style.transition = `${transitionDuration}ms ease`;
    element.style.backgroundPosition = "100% 100%, 0 0";
  }

  function animateOut() {
    const element = overlayRef.current;
    if (!element) {
      return;
    }

    element.style.transition = `${transitionDuration}ms ease`;
    element.style.backgroundPosition = "-100% -100%, 0 0";
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={style}
      onMouseEnter={animateIn}
      onMouseLeave={animateOut}
    >
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          borderRadius,
          background: `linear-gradient(${glareAngle}deg, transparent 60%, ${rgba} 72%, transparent 100%)`,
          backgroundSize: `${glareSize}% ${glareSize}%, 100% 100%`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "-100% -100%, 0 0",
        }}
      />
      <div className="relative z-0 h-full w-full">{children}</div>
    </div>
  );
}
