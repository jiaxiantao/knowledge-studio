"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView } from "motion/react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type AnimatedContentProps = {
  children: ReactNode;
  className?: string;
  distance?: number;
  direction?: "up" | "down" | "left" | "right";
  duration?: number;
  delay?: number;
  once?: boolean;
  amount?: number;
  scale?: number;
};

function getOffset(direction: AnimatedContentProps["direction"], distance: number) {
  switch (direction) {
    case "down":
      return { x: 0, y: -distance };
    case "left":
      return { x: distance, y: 0 };
    case "right":
      return { x: -distance, y: 0 };
    case "up":
    default:
      return { x: 0, y: distance };
  }
}

export function AnimatedContent({
  children,
  className,
  distance = 24,
  direction = "up",
  duration = 0.55,
  delay = 0,
  once = true,
  amount = 0.18,
  scale = 0.98,
}: AnimatedContentProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once, amount });
  const offset = getOffset(direction, distance);
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        x: offset.x,
        y: offset.y,
        scale,
        filter: "blur(8px)",
      }}
      animate={
        inView
          ? {
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
            }
          : undefined
      }
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
