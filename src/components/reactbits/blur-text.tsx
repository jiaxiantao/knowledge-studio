"use client";

import { motion } from "motion/react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type BlurTextProps = {
  text: string;
  className?: string;
  animateBy?: "letters" | "words";
  delay?: number;
  direction?: "top" | "bottom";
};

export function BlurText({
  text,
  className,
  animateBy = "words",
  delay = 0.06,
  direction = "bottom",
}: BlurTextProps) {
  const reducedMotion = usePrefersReducedMotion();
  const tokens = animateBy === "letters" ? text.split("") : text.split(" ");
  const initialY = direction === "top" ? -18 : 18;

  if (reducedMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {tokens.map((token, index) => (
        <motion.span
          key={`${token}-${index}`}
          initial={{ opacity: 0, y: initialY, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.42,
            delay: index * delay,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ display: "inline-block", willChange: "transform, filter, opacity" }}
        >
          {token === " " ? "\u00A0" : token}
          {animateBy === "words" && index < tokens.length - 1 ? "\u00A0" : null}
        </motion.span>
      ))}
    </span>
  );
}
