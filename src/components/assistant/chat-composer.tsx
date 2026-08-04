"use client";

import { ImagePlus, Mic, MicOff, Square, Send } from "lucide-react";
import { useRef, useState } from "react";

import { AnimatedContent } from "@/components/reactbits/animated-content";
import { BorderGlow } from "@/components/reactbits/border-glow";
import { DecryptedText } from "@/components/reactbits/decrypted-text";
import { GlareHover } from "@/components/reactbits/glare-hover";
import type { ChatImageAttachment } from "@/lib/chat-types";

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  images: ChatImageAttachment[];
  onImagesChange: (images: ChatImageAttachment[]) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  onStop: () => void;
};

export function ChatComposer({
  value,
  onChange,
  images,
  onImagesChange,
  isSubmitting,
  onSubmit,
  onStop,
}: ChatComposerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  async function handleImagePick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) {
      return;
    }

    const next: ChatImageAttachment[] = [];

    for (const file of Array.from(files).slice(0, 3)) {
      const dataUrl = await readFileAsDataUrl(file);
      next.push({ name: file.name, dataUrl });
    }

    onImagesChange([...images, ...next].slice(0, 3));
    event.target.value = "";
  }

  function toggleVoice() {
    setVoiceError(null);

    type SpeechRecognitionInstance = {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    };

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };

    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? win.SpeechRecognition ?? win.webkitSpeechRecognition
        : undefined;

    if (!SpeechRecognitionCtor) {
      setVoiceError("当前浏览器不支持 Web Speech API");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join("");
      onChange(`${value} ${transcript}`.trim());
    };

    recognition.onerror = () => {
      setVoiceError("语音识别失败");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    setIsListening(true);
    recognition.start();
  }

  return (
    <div className="mt-6 grid gap-3">
      {images.length ? (
        <AnimatedContent className="flex flex-wrap gap-2" distance={10}>
          {images.map((image) => (
            <figure
              key={image.name}
              className="relative overflow-hidden rounded-xl border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.dataUrl}
                alt={image.name}
                className="h-20 w-20 object-cover"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-slate-950/40 px-1 py-0.5 font-mono text-[9px] text-slate-300">
                {image.name}
              </figcaption>
            </figure>
          ))}
          <button
            type="button"
            onClick={() => onImagesChange([])}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 hover:text-white"
          >
            清除图片
          </button>
        </AnimatedContent>
      ) : null}

      <BorderGlow className="rounded-3xl" glowColor="rgba(103, 232, 249, 0.18)">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          placeholder="输入问题，支持 Markdown、图片附件说明、语音输入…"
          className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
      </BorderGlow>

      {voiceError ? (
        <p className="text-xs text-amber-200">{voiceError}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => void handleImagePick(event)}
        />
        <GlareHover className="rounded-full border border-white/10 bg-white/5" glareColor="#67e8f9">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-slate-200"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            图片
          </button>
        </GlareHover>
        <GlareHover
          className={`rounded-full border ${
            isListening
              ? "border-rose-300/35 bg-rose-300/10"
              : "border-white/10 bg-white/5"
          }`}
          glareColor={isListening ? "#fda4af" : "#67e8f9"}
        >
          <button
            type="button"
            onClick={toggleVoice}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs transition ${
              isListening ? "text-rose-100" : "text-slate-200"
            }`}
          >
            {isListening ? (
              <MicOff className="h-3.5 w-3.5" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
            {isListening ? "停止听写" : "语音输入"}
          </button>
        </GlareHover>

        {isSubmitting ? (
          <button
              type="button"
              onClick={onStop}
              className="inline-flex items-center gap-2 rounded-full border border-rose-300/35 bg-rose-300/10 px-5 py-2.5 text-sm font-semibold text-rose-100"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              停止生成
            </button>
        ) : (
          <button
              type="button"
              onClick={onSubmit}
              disabled={!value.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              发送
            </button>
        )}
      </div>
      <p className="font-mono text-[10px] text-slate-500">
        <DecryptedText
          text="⌘/Ctrl + Enter 发送 · 图片会作为多模态上下文说明（演示）"
          revealOnHover
          speed={12}
        />
      </p>
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
