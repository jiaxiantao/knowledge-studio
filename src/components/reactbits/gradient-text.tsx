"use client";

import { motion, useAnimationFrame, useMotionValue, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type GradientTextProps = {
  children: ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  direction?: "horizontal" | "vertical" | "diagonal";
  pauseOnHover?: boolean;
  yoyo?: boolean;
};

export function GradientText({
  children,
  className = "",
  colors = ["#67e8f9", "#a78bfa", "#d8b4fe"],
  animationSpeed = 8,
  direction = "horizontal",
  pauseOnHover = false,
  yoyo = true,
}: GradientTextProps) {
  const [isPaused, setIsPaused] = useState(false);
  const progress = useMotionValue(0);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  useAnimationFrame((time) => {
    if (isPaused) {
      lastTimeRef.current = null;
      return;
    }

    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      return;
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    elapsedRef.current += deltaTime;

    const animationDuration = animationSpeed * 1000;

    if (yoyo) {
      const fullCycle = animationDuration * 2;
      const cycleTime = elapsedRef.current % fullCycle;

      if (cycleTime < animationDuration) {
        progress.set((cycleTime / animationDuration) * 100);
      } else {
        progress.set(100 - ((cycleTime - animationDuration) / animationDuration) * 100);
      }
      return;
    }

    progress.set((elapsedRef.current / animationDuration) * 100);
  });

  useEffect(() => {
    elapsedRef.current = 0;
    progress.set(0);
  }, [animationSpeed, progress, yoyo]);

  const backgroundPosition = useTransform(progress, (p) => {
    if (direction === "vertical") {
      return `50% ${p}%`;
    }

    return `${p}% 50%`;
  });

  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) {
      setIsPaused(true);
    }
  }, [pauseOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) {
      setIsPaused(false);
    }
  }, [pauseOnHover]);

  const gradientAngle =
    direction === "horizontal"
      ? "to right"
      : direction === "vertical"
        ? "to bottom"
        : "to bottom right";

  return (
    <motion.span
      className={`inline-block text-transparent ${className}`}
      style={{
        backgroundImage: `linear-gradient(${gradientAngle}, ${[...colors, colors[0]].join(", ")})`,
        backgroundSize:
          direction === "horizontal"
            ? "300% 100%"
            : direction === "vertical"
              ? "100% 300%"
              : "300% 300%",
        backgroundPosition,
        backgroundRepeat: "repeat",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.span>
  );
}
