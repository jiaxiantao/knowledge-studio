"use client";

import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

import type { DocumentPreviewPayload } from "@/lib/document-preview-types";
import type { DocumentRecord } from "@/lib/documents-service";
import { isStaticSite } from "@/lib/site-mode";
import { apiFetch } from "@/lib/api-fetch";

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function SpreadsheetPreview({
  sheets,
}: {
  sheets: NonNullable<DocumentPreviewPayload["sheets"]>;
}) {
  const [active, setActive] = useState(sheets[0]?.name ?? "");

  const current = useMemo(
    () => sheets.find((sheet) => sheet.name === active) ?? sheets[0],
    [active, sheets],
  );

  if (!current) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
      {sheets.length > 1 ? (
        <div className="flex flex-wrap gap-2 border-b border-white/10 px-4 py-3">
          {sheets.map((sheet) => (
            <button
              key={sheet.name}
              type="button"
              onClick={() => setActive(sheet.name)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                sheet.name === current.name
                  ? "bg-white text-slate-950"
                  : "border border-white/10 text-slate-300 hover:text-white"
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      ) : null}
      <div
        className="min-h-0 flex-1 overflow-auto p-4 [scrollbar-gutter:stable] [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:text-slate-200 [&_th]:border [&_th]:border-white/10 [&_th]:bg-white/5 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-slate-300"
        dangerouslySetInnerHTML={{ __html: current.html }}
      />
    </div>
  );
}

function PreviewBody({
  preview,
}: {
  preview: DocumentPreviewPayload;
}) {
  if (preview.mode === "pdf" && preview.fileUrl) {
    return (
      <iframe
        title="PDF 预览"
        src={preview.fileUrl}
        className="min-h-0 flex-1 rounded-2xl border border-white/10 bg-white"
      />
    );
  }

  if (preview.mode === "image" && preview.fileUrl) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-2xl border border-white/10 bg-slate-950/40 p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview.fileUrl}
          alt="文档预览"
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  if (preview.mode === "markdown" && preview.content) {
    return (
      <article className="min-h-0 flex-1 overflow-auto rounded-2xl border border-white/10 bg-slate-950/40 p-6 [scrollbar-gutter:stable]">
        <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white prose-code:text-cyan-200">
          <ReactMarkdown>{preview.content}</ReactMarkdown>
        </div>
      </article>
    );
  }

  if (preview.mode === "html" && preview.content) {
    return (
      <iframe
        title="HTML 预览"
        sandbox=""
        srcDoc={preview.content}
        className="min-h-0 flex-1 rounded-2xl border border-white/10 bg-white"
      />
    );
  }

  if (preview.mode === "rich-html" && preview.content) {
    return (
      <article
        className="min-h-0 flex-1 overflow-auto rounded-2xl border border-white/10 bg-slate-950/40 p-6 [scrollbar-gutter:stable] [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-white [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-white [&_li]:text-slate-300 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_p]:leading-7 [&_p]:text-slate-300 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:text-slate-200 [&_th]:border [&_th]:border-white/10 [&_th]:bg-white/5 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:text-slate-300 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: preview.content }}
      />
    );
  }

  if (preview.mode === "spreadsheet" && preview.sheets?.length) {
    return <SpreadsheetPreview sheets={preview.sheets} />;
  }

  if (
    (preview.mode === "text" || preview.mode === "text-extract") &&
    preview.content
  ) {
    return (
      <pre className="min-h-0 flex-1 overflow-auto rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-sm leading-7 whitespace-pre-wrap text-slate-200 [scrollbar-gutter:stable]">
        {preview.content}
      </pre>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-slate-500">
      暂无可预览内容。
    </div>
  );
}

export function DocumentPreviewView({
  id,
  knowledgeBaseId,
}: {
  id: string;
  knowledgeBaseId?: string;
}) {
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [preview, setPreview] = useState<DocumentPreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !isStaticSite());
  const staticSite = isStaticSite();

  const loadPreview = useCallback(async () => {
    if (staticSite || !id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/documents/${id}/preview`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        document?: DocumentRecord;
        preview?: DocumentPreviewPayload;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "加载预览失败");
      }

      setDocument(payload.document ?? null);
      setPreview(payload.preview ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载预览失败");
    } finally {
      setLoading(false);
    }
  }, [id, staticSite]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload preview when document changes
    void loadPreview();
  }, [loadPreview]);

  const chunksHref =
    knowledgeBaseId && id
      ? `/knowledge/chunks?id=${encodeURIComponent(id)}&kb=${encodeURIComponent(knowledgeBaseId)}`
      : null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 px-4 py-8 text-sm text-slate-500">
        正在生成预览…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-6 text-sm text-rose-100">
        {error}
      </div>
    );
  }

  if (!document || !preview) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-slate-500">
        未找到文档预览。
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <section className="shrink-0 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-white">
              {document.name}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {document.format.toUpperCase()} · {formatBytes(document.sizeBytes)}
              {document.chunkCount != null ? ` · ${document.chunkCount} 切片` : ""}
            </p>
            {preview.notice ? (
              <p className="mt-2 text-xs text-amber-100/90">{preview.notice}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {chunksHref ? (
              <Link
                href={chunksHref}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:text-white"
              >
                查看切片
              </Link>
            ) : null}
            <a
              href={`/api/documents/${document.id}/file`}
              download={document.name}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:text-white"
            >
              <Download className="h-4 w-4" />
              下载原文件
            </a>
            <a
              href={`/api/documents/${document.id}/file`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
              新窗口打开
            </a>
          </div>
        </div>
      </section>

      <div className="flex min-h-0 flex-1 flex-col">
        <PreviewBody preview={preview} />
      </div>
    </div>
  );
}
