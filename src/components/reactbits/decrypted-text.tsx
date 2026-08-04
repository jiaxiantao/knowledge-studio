"use client";

import { useEffect, useMemo, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type DecryptedTextProps = {
  text: string;
  className?: string;
  speed?: number;
  revealOnHover?: boolean;
  characters?: string;
};

const DEFAULT_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/*+-_";

function randomCharacter(characters: string) {
  return characters[Math.floor(Math.random() * characters.length)] ?? "";
}

export function DecryptedText({
  text,
  className,
  speed = 26,
  revealOnHover = false,
  characters = DEFAULT_CHARACTERS,
}: DecryptedTextProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [displayText, setDisplayText] = useState(revealOnHover ? text : "");
  const [active, setActive] = useState(!revealOnHover);
  const target = useMemo(() => text.split(""), [text]);

  useEffect(() => {
    if (reducedMotion || !active) {
      return;
    }

    let frame = 0;
    const timer = window.setInterval(() => {
      frame += 1;
      const next = target
        .map((char, index) => {
          if (char === " ") {
            return " ";
          }
          return index < frame ? char : randomCharacter(characters);
        })
        .join("");

      setDisplayText(next);

      if (frame > target.length) {
        window.clearInterval(timer);
        setDisplayText(text);
        if (revealOnHover) {
          setActive(false);
        }
      }
    }, speed);

    return () => window.clearInterval(timer);
  }, [active, characters, reducedMotion, revealOnHover, speed, target, text]);

  if (reducedMotion) {
    return <span className={className}>{text}</span>;
  }

  const startReveal = () => {
    if (!revealOnHover) {
      return;
    }
    setActive(true);
  };

  return (
    <span
      className={className}
      aria-label={text}
      onMouseEnter={revealOnHover ? startReveal : undefined}
      onFocus={revealOnHover ? startReveal : undefined}
      tabIndex={revealOnHover ? 0 : undefined}
    >
      <span aria-hidden="true">{active ? displayText || text : text}</span>
    </span>
  );
}
