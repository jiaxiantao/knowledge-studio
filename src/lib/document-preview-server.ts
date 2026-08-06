import { readFile } from "node:fs/promises";

import type { DocumentFormat } from "@prisma/client";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

import type { DocumentRecord } from "@/lib/documents-service";
import type { DocumentPreviewPayload } from "@/lib/document-preview-types";

const IMAGE_FORMATS = new Set<DocumentFormat>([
  "png",
  "jpg",
  "jpeg",
  "bmp",
  "gif",
  "webp",
]);

const TEXT_PREVIEW_MAX_BYTES = 512 * 1024;
const HTML_PREVIEW_MAX_BYTES = 1024 * 1024;

function sanitizeHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, " ")
    .replace(/javascript:/gi, " ");
}

async function readTextPreview(absolutePath: string, maxBytes: number) {
  const buffer = await readFile(absolutePath);
  const slice = buffer.subarray(0, maxBytes);
  const content = slice.toString("utf8");
  const truncated = buffer.byteLength > maxBytes;

  return {
    content,
    notice: truncated
      ? `文件较大，仅预览前 ${Math.round(maxBytes / 1024)}KB`
      : undefined,
  };
}

async function previewDocxHtml(absolutePath: string) {
  const result = await mammoth.convertToHtml({ path: absolutePath });
  return {
    content: sanitizeHtml(result.value),
    notice:
      result.messages.length > 0
        ? "部分复杂样式可能无法完全还原"
        : undefined,
  };
}

async function previewSpreadsheet(absolutePath: string) {
  const workbook = XLSX.readFile(absolutePath, { cellDates: true });
  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) {
      return { name, html: "<p>空工作表</p>" };
    }

    return {
      name,
      html: sanitizeHtml(XLSX.utils.sheet_to_html(sheet)),
    };
  });

  return { sheets };
}

async function previewOfficeText(
  absolutePath: string,
  format: DocumentFormat,
) {
  const { extractTextFromFile } = await import("@/lib/document-ingest");
  try {
    const content = await extractTextFromFile(absolutePath, format);
    return {
      content: content.trim(),
      notice: "浏览器无法直接渲染该 Office 格式，以下为提取的正文预览",
    };
  } catch (error) {
    return {
      content: "",
      notice:
        error instanceof Error
          ? error.message
          : "无法提取 Office 正文预览",
    };
  }
}

export async function buildDocumentPreview(
  document: DocumentRecord,
  absolutePath: string,
): Promise<DocumentPreviewPayload> {
  const fileUrl = `/api/documents/${document.id}/file`;

  if (document.format === "pdf") {
    return { mode: "pdf", fileUrl };
  }

  if (IMAGE_FORMATS.has(document.format)) {
    return { mode: "image", fileUrl };
  }

  if (document.format === "md") {
    const { content, notice } = await readTextPreview(
      absolutePath,
      TEXT_PREVIEW_MAX_BYTES,
    );
    return { mode: "markdown", content, notice };
  }

  if (document.format === "txt") {
    const { content, notice } = await readTextPreview(
      absolutePath,
      TEXT_PREVIEW_MAX_BYTES,
    );
    return { mode: "text", content, notice };
  }

  if (document.format === "html") {
    const { content, notice } = await readTextPreview(
      absolutePath,
      HTML_PREVIEW_MAX_BYTES,
    );
    return {
      mode: "html",
      content: sanitizeHtml(content),
      notice,
    };
  }

  if (document.format === "docx") {
    const { content, notice } = await previewDocxHtml(absolutePath);
    return { mode: "rich-html", content, notice };
  }

  if (document.format === "xls" || document.format === "xlsx") {
    const { sheets } = await previewSpreadsheet(absolutePath);
    return { mode: "spreadsheet", sheets };
  }

  if (
    document.format === "doc" ||
    document.format === "ppt" ||
    document.format === "pptx"
  ) {
    const { content, notice } = await previewOfficeText(
      absolutePath,
      document.format,
    );
    return {
      mode: "text-extract",
      content: content.slice(0, TEXT_PREVIEW_MAX_BYTES),
      notice,
    };
  }

  const { content, notice } = await readTextPreview(
    absolutePath,
    TEXT_PREVIEW_MAX_BYTES,
  );
  return {
    mode: "text",
    content,
    notice: notice ?? "该格式暂不支持原生预览，以下为文本内容",
  };
}
