"use client";

import { useInView, useMotionValue, useSpring } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

type CountUpProps = {
  to: number;
  from?: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
};

export function CountUp({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 2,
  className = "",
  startWhen = true,
  separator = "",
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const motionValue = useMotionValue(direction === "down" ? to : from);
  const springValue = useSpring(motionValue, {
    damping: 20 + 40 * (1 / duration),
    stiffness: 100 * (1 / duration),
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  const formatValue = useCallback(
    (latest: number) => {
      const formattedNumber = Intl.NumberFormat("en-US", {
        useGrouping: Boolean(separator),
        maximumFractionDigits: 0,
      }).format(Math.round(latest));

      return separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
    },
    [separator],
  );

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    ref.current.textContent = formatValue(direction === "down" ? to : from);
  }, [direction, formatValue, from, to]);

  useEffect(() => {
    if (!isInView || !startWhen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      motionValue.set(direction === "down" ? from : to);
    }, delay * 1000);

    return () => window.clearTimeout(timeoutId);
  }, [delay, direction, from, isInView, motionValue, startWhen, to]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = formatValue(latest);
      }
    });

    return () => unsubscribe();
  }, [formatValue, springValue]);

  return <span ref={ref} className={className} />;
}
