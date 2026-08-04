"use client";

import { motion } from "motion/react";
import type { Key, ReactNode } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type AnimatedListProps<T> = {
  items: T[];
  className?: string;
  itemClassName?: string;
  stagger?: number;
  getKey?: (item: T, index: number) => Key;
  renderItem: (item: T, index: number) => ReactNode;
};

export function AnimatedList<T>({
  items,
  className,
  itemClassName,
  stagger = 0.08,
  getKey,
  renderItem,
}: AnimatedListProps<T>) {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return (
      <div className={className}>
        {items.map((item, index) => (
          <div key={getKey?.(item, index) ?? index} className={itemClassName}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
          },
        },
      }}
    >
      {items.map((item, index) => (
        <motion.div
          key={getKey?.(item, index) ?? index}
          className={itemClassName}
          variants={{
            hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
            visible: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
            },
          }}
        >
          {renderItem(item, index)}
        </motion.div>
      ))}
    </motion.div>
  );
}
