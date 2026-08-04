"use client";

import ReactMarkdown from "react-markdown";

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const match = /language-(\w+)/.exec(className ?? "");
  const language = match?.[1] ?? "text";

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-white/10 bg-slate-950">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
          {language}
        </span>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-7 text-cyan-50/95">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

export function AssistantMarkdown({
  content,
  streaming = false,
}: {
  content: string;
  streaming?: boolean;
}) {
  if (!content && streaming) {
    return (
      <span className="inline-flex items-center gap-1 text-slate-200">
        <span className="streaming-cursor">▍</span>
      </span>
    );
  }

  return (
    <div className="assistant-markdown text-sm leading-8 text-slate-200">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h2 className="mt-4 text-xl font-semibold text-white">{children}</h2>
          ),
          h2: ({ children }) => (
            <h2 className="mt-4 text-lg font-semibold text-white">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 text-base font-semibold text-white">{children}</h3>
          ),
          p: ({ children }) => <p className="my-2">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-cyan-300/40 pl-4 text-slate-300">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4 hover:text-white"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const isBlock = String(className ?? "").includes("language-");

            if (isBlock) {
              return (
                <CodeBlock className={className}>{children}</CodeBlock>
              );
            }

            return (
              <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-cyan-100">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {content}
      </ReactMarkdown>
      {streaming ? (
        <span className="streaming-cursor ml-0.5 inline-block text-cyan-200">
          ▍
        </span>
      ) : null}
    </div>
  );
}
