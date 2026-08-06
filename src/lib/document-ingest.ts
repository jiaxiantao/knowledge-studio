import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { createRequire } from "node:module";

import type { DocumentFormat } from "@prisma/client";
import { imageSize } from "image-size";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

import { extractTextFromPdfWithOcr, supplementSparsePdfPagesWithOcr } from "@/lib/pdf-ocr";
import {
  extractTextFromPdfWithPdfJs,
  pickBetterPdfText,
} from "@/lib/pdf-text-extract";
import { isPdfOcrEnabled } from "@/lib/rag-config";
import {
  detectUploadFormat,
  PDF_MAX_PAGES,
  SPREADSHEET_MAX_ROWS,
  uploadKindOf,
  validateImageDimensions,
  type DocumentFormatId,
} from "@/lib/upload-rules";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (
  buffer: Buffer,
) => Promise<{ text?: string; numpages?: number }>;

const WordExtractor = require("word-extractor") as new () => {
  extract: (input: string | Buffer) => Promise<{
    getBody: () => string;
    getHeaders: () => { headers: string; footers: string };
  }>;
};

const pptToText = require("ppt-to-text") as {
  extractText: (
    input: string | Buffer,
    options?: { separator?: string },
  ) => string;
};

export type ExtractTextOptions = {
  onProgress?: (payload: {
    phase: "text" | "ocr";
    ratio: number;
    message?: string;
  }) => void | Promise<void>;
};

const IMAGE_FORMATS = new Set<DocumentFormat>([
  "png",
  "jpg",
  "jpeg",
  "bmp",
  "gif",
  "webp",
]);

export function detectFormat(filename: string): DocumentFormat | null {
  return detectUploadFormat(filename) as DocumentFormat | null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractOfficeText(absolutePath: string): Promise<string> {
  const { parseOffice } = await import("officeparser");
  const ast = await parseOffice(absolutePath);
  const text =
    typeof (ast as { toText?: () => string }).toText === "function"
      ? (ast as { toText: () => string }).toText()
      : String(ast ?? "");
  return text.trim();
}

function looksLikePlainText(buffer: Buffer) {
  if (buffer.byteLength === 0) {
    return false;
  }

  const sample = buffer.subarray(0, Math.min(buffer.byteLength, 4096));
  let printable = 0;
  let control = 0;
  for (const byte of sample) {
    if (byte === 0x00) {
      control += 1;
      continue;
    }
    if (
      byte === 0x09 ||
      byte === 0x0a ||
      byte === 0x0d ||
      (byte >= 0x20 && byte <= 0x7e)
    ) {
      printable += 1;
    } else if (byte < 0x20) {
      control += 1;
    }
  }

  // Require mostly ASCII printables; OLE/binary blobs have many NULs / high bytes.
  return (
    printable / sample.byteLength >= 0.75 &&
    control / sample.byteLength <= 0.05
  );
}

function isOleCompound(buffer: Buffer) {
  return (
    buffer.byteLength >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  );
}

function looksEncryptedOffice(buffer: Buffer) {
  const haystack = buffer.subarray(0, Math.min(buffer.byteLength, 256 * 1024));
  const ascii = haystack.toString("latin1");
  return (
    ascii.includes("EncryptedPackage") ||
    ascii.includes("EncryptionInfo") ||
    ascii.includes("EncryptedSummary")
  );
}

function isZipArchive(buffer: Buffer) {
  return (
    buffer.byteLength >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  );
}

function friendlyOfficeError(format: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    /\bencrypt(?:ed|ion)?\b/.test(lower) ||
    lower.includes("password") ||
    lower.includes("ecma-376 encrypted")
  ) {
    return `该 ${format.toUpperCase()} 文件已加密，无法解析正文。请先解密后再上传。`;
  }

  if (
    lower.includes("corrupt") ||
    lower.includes("zip") ||
    lower.includes("invalid") ||
    lower.includes("outside buffer") ||
    lower.includes("allocation table") ||
    lower.includes("unable to read") ||
    lower.includes("cannot read")
  ) {
    return `该 ${format.toUpperCase()} 文件可能已加密、损坏或不完整，无法解析正文。`;
  }

  return `解析 ${format.toUpperCase()} 失败：${message}`;
}

async function extractLegacyDoc(absolutePath: string): Promise<string> {
  const buffer = await readFile(absolutePath);

  if (looksEncryptedOffice(buffer)) {
    throw new Error(
      "该 DOC 文件已加密，无法解析正文。请先解密后再上传。",
    );
  }

  try {
    const extractor = new WordExtractor();
    const document = await extractor.extract(buffer);
    const body = (document.getBody() || "").trim();
    const headers = document.getHeaders();
    const extras = [headers.headers, headers.footers]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join("\n");
    const text = [body, extras].filter(Boolean).join("\n\n").trim();
    if (text) {
      return text;
    }
  } catch (error) {
    // Misnamed .doc that is actually plain text / RTF-like text.
    if (!isOleCompound(buffer) && looksLikePlainText(buffer)) {
      const asText = stripHtml(buffer.toString("utf8"));
      if (asText) {
        return asText;
      }
    }
    throw new Error(friendlyOfficeError("doc", error));
  }

  if (!isOleCompound(buffer) && looksLikePlainText(buffer)) {
    const asText = stripHtml(buffer.toString("utf8"));
    if (asText) {
      return asText;
    }
  }

  throw new Error("未能从 DOC 文件提取到文字内容");
}

async function extractLegacyPpt(absolutePath: string): Promise<string> {
  const buffer = await readFile(absolutePath);

  if (looksEncryptedOffice(buffer)) {
    throw new Error(
      "该 PPT 文件已加密，无法解析正文。请先解密后再上传。",
    );
  }

  try {
    const text = pptToText.extractText(buffer, { separator: "\n\n" }).trim();
    if (text) {
      return text;
    }
  } catch (error) {
    if (!isOleCompound(buffer) && looksLikePlainText(buffer)) {
      const asText = stripHtml(buffer.toString("utf8"));
      if (asText) {
        return asText;
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    // ppt-to-text may mis-report tiny corrupt OLE samples as ZIP encryption.
    if (
      isOleCompound(buffer) &&
      /zip encryption/i.test(message)
    ) {
      throw new Error("该 PPT 文件损坏、不完整或不是有效的 Office 文档。");
    }
    throw new Error(friendlyOfficeError("ppt", error));
  }

  throw new Error("未能从 PPT 文件提取到文字内容");
}

async function extractPptx(absolutePath: string): Promise<string> {
  const buffer = await readFile(absolutePath);

  if (!isZipArchive(buffer)) {
    if (looksLikePlainText(buffer)) {
      const asText = stripHtml(buffer.toString("utf8"));
      if (asText) {
        return asText;
      }
    }
    if (isOleCompound(buffer)) {
      throw new Error(
        "该 PPTX 文件已加密或仍为旧版复合文档格式，无法解析。请用 PowerPoint 另存为未加密的 .pptx 后再上传。",
      );
    }
    throw new Error("该 PPTX 文件不是有效的 OOXML（ZIP）文档，可能已损坏。");
  }

  try {
    const text = await extractOfficeText(absolutePath);
    if (text) {
      return text;
    }
    throw new Error("未能从 PPTX 文件提取到文字内容");
  } catch (error) {
    throw new Error(friendlyOfficeError("pptx", error));
  }
}

async function extractDocx(absolutePath: string): Promise<string> {
  const result = await mammoth.extractRawText({ path: absolutePath });
  return (result.value || "").trim();
}

async function extractSpreadsheet(absolutePath: string): Promise<string> {
  const workbook = XLSX.readFile(absolutePath, { cellDates: true });
  const parts: string[] = [];
  let totalRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      continue;
    }
    const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
      sheet,
      { header: 1, defval: "" },
    ) as unknown as unknown[][];
    totalRows += rows.length;
    if (totalRows > SPREADSHEET_MAX_ROWS) {
      throw new Error(`表格行数不能超过 ${SPREADSHEET_MAX_ROWS.toLocaleString()} 行`);
    }

    const lines = rows
      .map((row) =>
        (Array.isArray(row) ? row : [])
          .map((cell) => String(cell ?? "").trim())
          .filter(Boolean)
          .join("\t"),
      )
      .filter(Boolean);

    if (lines.length) {
      parts.push(`【工作表 ${sheetName}】\n${lines.join("\n")}`);
    }
  }

  return parts.join("\n\n").trim();
}

async function extractImageWithOcr(
  absolutePath: string,
  options: ExtractTextOptions,
): Promise<string> {
  const buffer = await readFile(absolutePath);
  const dim = imageSize(buffer);
  if (!dim.width || !dim.height) {
    throw new Error("无法读取图片尺寸");
  }
  const dimError = validateImageDimensions(dim.width, dim.height);
  if (dimError) {
    throw new Error(dimError);
  }

  await options.onProgress?.({
    phase: "ocr",
    ratio: 0.1,
    message: "正在 OCR 识别图片…",
  });

  const { createRequire: nodeRequire } = await import("node:module");
  const req = nodeRequire(import.meta.url);
  const { createWorker } = req("tesseract.js") as typeof import("tesseract.js");
  const pack = req("@tesseract.js-data/chi_sim") as {
    langPath: string;
    gzip?: boolean;
  };

  const worker = await createWorker("chi_sim", 1, {
    langPath: pack.langPath,
    gzip: pack.gzip !== false,
  });
  try {
    const recognized = await worker.recognize(buffer);
    const text = recognized.data.text.trim();
    await options.onProgress?.({
      phase: "ocr",
      ratio: 1,
      message: "图片 OCR 完成",
    });
    if (text) {
      return text;
    }

    // Decorative / non-text images should still index with metadata.
    const name = basename(absolutePath);
    return [
      `【图片】${name}`,
      `尺寸：${dim.width}×${dim.height}`,
      "OCR 未识别到有效文字；已按图片元数据入库，便于列表管理与预览。",
    ].join("\n");
  } finally {
    await worker.terminate();
  }
}

async function extractPdf(
  absolutePath: string,
  options: ExtractTextOptions,
): Promise<string> {
  const buffer = await readFile(absolutePath);
  await options.onProgress?.({
    phase: "text",
    ratio: 0.05,
    message: "正在解析 PDF…",
  });

  const parsed = await pdfParse(buffer);
  const pageCountFromParse = Number(parsed.numpages) || 0;
  if (pageCountFromParse > PDF_MAX_PAGES) {
    throw new Error(
      `PDF 页数不能超过 ${PDF_MAX_PAGES} 页（当前 ${pageCountFromParse} 页）`,
    );
  }

  let pdfJsResult = { text: "", pageCount: 0, pageTexts: [] as string[] };
  try {
    pdfJsResult = await extractTextFromPdfWithPdfJs(buffer, {
      onProgress: async ({ ratio }) => {
        await options.onProgress?.({
          phase: "text",
          ratio: 0.05 + ratio * 0.45,
          message: "正在逐页提取 PDF 文字…",
        });
      },
    });
  } catch (pdfJsError) {
    console.warn(
      "[pdf] pdfjs extraction failed, falling back to pdf-parse:",
      pdfJsError,
    );
  }

  const pdfParseResult = {
    text: (parsed.text || "").trim(),
    pageCount: pageCountFromParse,
  };

  const candidates = [
    { label: "pdfjs" as const, text: pdfJsResult.text, pageCount: pdfJsResult.pageCount },
    {
      label: "pdf-parse" as const,
      text: pdfParseResult.text,
      pageCount: pdfParseResult.pageCount,
    },
  ].filter((item) => item.text);

  const picked = pickBetterPdfText(candidates);

  const pageCount = Math.max(
    picked.pageCount,
    pdfJsResult.pageCount,
    pdfParseResult.pageCount,
  );

  let pageTexts =
    pdfJsResult.pageTexts.length > 0
      ? [...pdfJsResult.pageTexts]
      : picked.text
        ? [picked.text]
        : [];

  if (pageCount > 0 && pageTexts.length > 0 && isPdfOcrEnabled()) {
    if (pageTexts.length < pageCount) {
      pageTexts = [
        ...pageTexts,
        ...Array.from({ length: pageCount - pageTexts.length }, () => ""),
      ];
    } else if (pageTexts.length > pageCount) {
      pageTexts = pageTexts.slice(0, pageCount);
    }

    await options.onProgress?.({
      phase: "ocr",
      ratio: 0,
      message: `正在检测并 OCR 补全低质量页面（共 ${pageCount} 页）…`,
    });

    pageTexts = await supplementSparsePdfPagesWithOcr(buffer, pageTexts, {
      maxPages: Math.min(pageCount, PDF_MAX_PAGES),
      onProgress: async ({ page, totalPages, ratio }) => {
        await options.onProgress?.({
          phase: "ocr",
          ratio,
          message: `OCR 补全 ${page}/${totalPages}`,
        });
      },
    });
  }

  const merged = pageTexts.filter(Boolean).join("\n\n").trim() || picked.text.trim();
  if (merged) {
    await options.onProgress?.({
      phase: "text",
      ratio: 1,
      message:
        picked.source === "pdfjs"
          ? "PDF 逐页提取完成"
          : "PDF 文字层提取完成",
    });
    return merged;
  }

  await options.onProgress?.({
    phase: "ocr",
    ratio: 0,
    message:
      pageCount > 0
        ? `未检测到文字层（${pageCount} 页），开始 OCR…`
        : "未检测到文字层，开始 OCR…",
  });

  try {
    return await extractTextFromPdfWithOcr(buffer, {
      onProgress: async ({ page, totalPages, ratio }) => {
        await options.onProgress?.({
          phase: "ocr",
          ratio,
          message: `OCR 识别中 ${page}/${totalPages}`,
        });
      },
    });
  } catch (ocrError) {
    const detail = ocrError instanceof Error ? ocrError.message : "OCR 失败";
    throw new Error(
      pageCount > 0
        ? `未能从 PDF 提取到文字（共 ${pageCount} 页）。${detail}`
        : `未能从 PDF 提取到文字内容。${detail}`,
    );
  }
}

export async function extractTextFromFile(
  absolutePath: string,
  format: DocumentFormat,
  options: ExtractTextOptions = {},
): Promise<string> {
  const formatId = format as DocumentFormatId;

  if (format === "pdf") {
    return extractPdf(absolutePath, options);
  }

  if (IMAGE_FORMATS.has(format)) {
    return extractImageWithOcr(absolutePath, options);
  }

  if (format === "docx") {
    return extractDocx(absolutePath);
  }

  if (format === "xls" || format === "xlsx") {
    return extractSpreadsheet(absolutePath);
  }

  if (format === "doc") {
    return extractLegacyDoc(absolutePath);
  }

  if (format === "ppt") {
    return extractLegacyPpt(absolutePath);
  }

  if (format === "pptx") {
    return extractPptx(absolutePath);
  }

  if (format === "html") {
    const html = await readFile(absolutePath, "utf8");
    return stripHtml(html);
  }

  if (uploadKindOf(formatId) === "plaintext" || format === "md" || format === "txt") {
    const text = await readFile(absolutePath, "utf8");
    return text.trim();
  }

  throw new Error(`暂不支持解析该格式：${format}`);
}
