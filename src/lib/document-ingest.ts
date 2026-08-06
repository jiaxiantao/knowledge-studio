import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

import type { DocumentFormat } from "@prisma/client";
import { imageSize } from "image-size";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

import { extractTextFromPdfWithOcr } from "@/lib/pdf-ocr";
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
    if (!text) {
      throw new Error("图片 OCR 未能识别出有效文字");
    }
    return text;
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
    ratio: 0.15,
    message: "正在提取 PDF 文字层…",
  });

  const parsed = await pdfParse(buffer);
  const pages = Number(parsed.numpages) || 0;
  if (pages > PDF_MAX_PAGES) {
    throw new Error(`PDF 页数不能超过 ${PDF_MAX_PAGES} 页（当前 ${pages} 页）`);
  }

  const text = (parsed.text || "").trim();
  if (text) {
    await options.onProgress?.({
      phase: "text",
      ratio: 1,
      message: "已提取 PDF 文字层",
    });
    return text;
  }

  await options.onProgress?.({
    phase: "ocr",
    ratio: 0,
    message:
      pages > 0
        ? `未检测到文字层（${pages} 页），开始 OCR…`
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
      pages > 0
        ? `未能从 PDF 提取到文字（共 ${pages} 页）。${detail}`
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

  if (format === "doc" || format === "ppt" || format === "pptx") {
    return extractOfficeText(absolutePath);
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
