/**
 * Upload format / size rules aligned with Alibaba Cloud Knowledge Studio style limits.
 * Shared by client validation and server ingest (no Node-only imports).
 */

export const MAX_UPLOAD_FILES = 50;

/** Absolute ceiling for any single file (documents). */
export const ABSOLUTE_MAX_UPLOAD_BYTES = 150 * 1024 * 1024;

export type UploadKind = "document" | "spreadsheet" | "image" | "plaintext";

export type DocumentFormatId =
  | "md"
  | "txt"
  | "html"
  | "pdf"
  | "doc"
  | "docx"
  | "ppt"
  | "pptx"
  | "xls"
  | "xlsx"
  | "png"
  | "jpg"
  | "jpeg"
  | "bmp"
  | "gif"
  | "webp";

const EXT_TO_FORMAT: Record<string, DocumentFormatId> = {
  md: "md",
  markdown: "md",
  txt: "txt",
  html: "html",
  htm: "html",
  pdf: "pdf",
  doc: "doc",
  docx: "docx",
  ppt: "ppt",
  pptx: "pptx",
  xls: "xls",
  xlsx: "xlsx",
  png: "png",
  jpg: "jpg",
  jpeg: "jpeg",
  bmp: "bmp",
  gif: "gif",
  webp: "webp",
};

const FORMAT_KIND: Record<DocumentFormatId, UploadKind> = {
  pdf: "document",
  doc: "document",
  docx: "document",
  ppt: "document",
  pptx: "document",
  xls: "spreadsheet",
  xlsx: "spreadsheet",
  png: "image",
  jpg: "image",
  jpeg: "image",
  bmp: "image",
  gif: "image",
  webp: "image",
  md: "plaintext",
  txt: "plaintext",
  html: "plaintext",
};

const KIND_MAX_BYTES: Record<UploadKind, number> = {
  document: 150 * 1024 * 1024,
  spreadsheet: 10 * 1024 * 1024,
  image: 20 * 1024 * 1024,
  plaintext: 10 * 1024 * 1024,
};

export const PDF_MAX_PAGES = 1000;
export const SPREADSHEET_MAX_ROWS = 100_000;
export const IMAGE_MIN_SHORT_SIDE = 15;
export const IMAGE_MAX_LONG_SIDE = 8192;
export const IMAGE_MAX_ASPECT_RATIO = 50;

export const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".bmp",
  ".gif",
  ".webp",
  ".md",
  ".markdown",
  ".txt",
  ".html",
  ".htm",
] as const;

export function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) {
    return "";
  }
  return filename.slice(idx + 1).toLowerCase();
}

export function detectUploadFormat(filename: string): DocumentFormatId | null {
  const ext = extensionOf(filename);
  return EXT_TO_FORMAT[ext] ?? null;
}

export function uploadKindOf(format: DocumentFormatId): UploadKind {
  return FORMAT_KIND[format];
}

export function maxBytesForFormat(format: DocumentFormatId): number {
  return KIND_MAX_BYTES[FORMAT_KIND[format]];
}

export function formatBytesLabel(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function acceptAttribute(): string {
  return ACCEPTED_EXTENSIONS.join(",");
}

/** Client/server size + extension check (not image pixels / PDF pages). */
export function validateUploadBasics(
  filename: string,
  sizeBytes: number,
): { ok: true; format: DocumentFormatId } | { ok: false; error: string } {
  const format = detectUploadFormat(filename);
  if (!format) {
    return {
      ok: false,
      error:
        "不支持的文件类型。支持文档 / 表格 / 图片 / 纯文本，详见格式说明。",
    };
  }

  const maxBytes = maxBytesForFormat(format);
  if (sizeBytes > maxBytes) {
    const kind = uploadKindOf(format);
    const label =
      kind === "document"
        ? "单文档"
        : kind === "spreadsheet"
          ? "表格"
          : kind === "image"
            ? "单图片"
            : "纯文本";
    return {
      ok: false,
      error: `${label}大小不能超过 ${formatBytesLabel(maxBytes)}`,
    };
  }

  if (sizeBytes > ABSOLUTE_MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `文件大小不能超过 ${formatBytesLabel(ABSOLUTE_MAX_UPLOAD_BYTES)}`,
    };
  }

  return { ok: true, format };
}

export function validateImageDimensions(width: number, height: number): string | null {
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  if (shortSide <= IMAGE_MIN_SHORT_SIDE) {
    return `图片最短边需大于 ${IMAGE_MIN_SHORT_SIDE}px`;
  }
  if (longSide >= IMAGE_MAX_LONG_SIDE) {
    return `图片最长边需小于 ${IMAGE_MAX_LONG_SIDE}px`;
  }
  const ratio = longSide / Math.max(shortSide, 1);
  if (ratio >= IMAGE_MAX_ASPECT_RATIO) {
    return `图片长宽比需小于 ${IMAGE_MAX_ASPECT_RATIO}`;
  }
  return null;
}
