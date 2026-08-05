"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ToastTone = "success" | "error";

type ToastState = {
  message: string;
  tone: ToastTone;
};

const listeners = new Set<(toast: ToastState | null) => void>();
let hideTimer: number | undefined;

function notify(toast: ToastState | null) {
  for (const listener of listeners) {
    listener(toast);
  }
}

export function showToast(message: string, tone: ToastTone = "success") {
  if (hideTimer) {
    window.clearTimeout(hideTimer);
  }

  notify({ message, tone });
  hideTimer = window.setTimeout(() => {
    notify(null);
    hideTimer = undefined;
  }, 2200);
}

export function ToastHost() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    listeners.add(setToast);
    return () => {
      window.clearTimeout(timer);
      listeners.delete(setToast);
    };
  }, []);

  if (!mounted || !toast || typeof document === "undefined") {
    return null;
  }

  const isSuccess = toast.tone === "success";

  return createPortal(
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2">
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl ${
          isSuccess
            ? "border-emerald-400/20 bg-slate-950/90 text-emerald-100"
            : "border-rose-400/20 bg-slate-950/90 text-rose-100"
        }`}
        role="status"
        aria-live="polite"
      >
        {isSuccess ? (
          <Check className="h-4 w-4 shrink-0 text-emerald-300" />
        ) : (
          <X className="h-4 w-4 shrink-0 text-rose-300" />
        )}
        <span>{toast.message}</span>
      </div>
    </div>,
    document.body,
  );
}
