import { createRequire } from "node:module";

import { createCanvas } from "@napi-rs/canvas";
import { PDFiumLibrary } from "@hyzyla/pdfium";
import { createWorker, type Worker } from "tesseract.js";

import {
  getOcrLangs,
  getOcrMaxPages,
  getOcrScale,
  getPdfSparsePageCharThreshold,
  isPdfOcrEnabled,
} from "@/lib/rag-config";
import { isLowQualityPageText, pickBetterPageText } from "@/lib/text-normalize";

export type PdfOcrProgress = {
  page: number;
  totalPages: number;
  ratio: number;
};

const require = createRequire(import.meta.url);

type LangPack = {
  code: string;
  gzip?: boolean;
  langPath: string;
};

function resolveLangPack(code: string): LangPack {
  try {
    return require(`@tesseract.js-data/${code}`) as LangPack;
  } catch {
    throw new Error(
      `缺少 OCR 语言包 @tesseract.js-data/${code}，请执行 pnpm add @tesseract.js-data/${code}`,
    );
  }
}

function bitmapToPng(image: {
  width: number;
  height: number;
  data: Uint8Array | Buffer;
}): Buffer {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(image.width, image.height);
  imgData.data.set(new Uint8ClampedArray(image.data));
  ctx.putImageData(imgData, 0, 0);
  return canvas.toBuffer("image/png");
}

async function withOcrWorker<T>(
  langs: string[],
  run: (worker: Worker) => Promise<T>,
): Promise<T> {
  // Multi-lang "a+b" packs are unreliable in tesseract.js WASM for CJK;
  // use the primary language pack (default chi_sim).
  const primary = langs[0] || "chi_sim";
  const pack = resolveLangPack(primary);
  const worker = await createWorker(primary, 1, {
    langPath: pack.langPath,
    gzip: pack.gzip !== false,
  });
  try {
    return await run(worker);
  } finally {
    await worker.terminate();
  }
}

async function ocrPdfPage(
  worker: Worker,
  page: { render: (options: { scale: number; render: "bitmap" }) => Promise<{
    width: number;
    height: number;
    data: Uint8Array | Buffer;
  }> },
  scale: number,
) {
  const rendered = await page.render({ scale, render: "bitmap" });
  const png = bitmapToPng(rendered);
  const recognized = await worker.recognize(png);
  return recognized.data.text.trim();
}

/**
 * OCR pages whose extracted text layer is empty or too sparse.
 * Used when pdfjs/pdf-parse only recover part of a textbook PDF.
 */
export async function supplementSparsePdfPagesWithOcr(
  pdfBytes: Buffer | Uint8Array,
  pageTexts: string[],
  options: {
    minCharsPerPage?: number;
    maxPages?: number;
    onProgress?: (progress: PdfOcrProgress) => void | Promise<void>;
  } = {},
): Promise<string[]> {
  if (!isPdfOcrEnabled()) {
    return pageTexts;
  }

  const langs = getOcrLangs();
  const scale = getOcrScale();
  const minChars =
    options.minCharsPerPage ?? getPdfSparsePageCharThreshold();
  const maxPages = options.maxPages ?? getOcrMaxPages();

  const library = await PDFiumLibrary.init();
  try {
    const document = await library.loadDocument(pdfBytes);
    try {
      const pageCount = Math.min(document.getPageCount(), maxPages, pageTexts.length);
      const merged = [...pageTexts];

      await withOcrWorker(langs, async (worker) => {
        for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
          const existing = merged[pageIndex]?.trim() ?? "";
          const compactLen = existing.replace(/\s+/g, "").length;
          const needsOcr =
            compactLen < minChars || isLowQualityPageText(existing);

          if (!needsOcr) {
            await options.onProgress?.({
              page: pageIndex + 1,
              totalPages: pageCount,
              ratio: (pageIndex + 1) / pageCount,
            });
            continue;
          }

          const page = document.getPage(pageIndex);
          const ocrText = await ocrPdfPage(worker, page, scale);
          if (ocrText) {
            merged[pageIndex] = pickBetterPageText(existing, ocrText);
          }

          await options.onProgress?.({
            page: pageIndex + 1,
            totalPages: pageCount,
            ratio: (pageIndex + 1) / pageCount,
          });
        }
      });

      return merged;
    } finally {
      document.destroy();
    }
  } finally {
    library.destroy();
  }
}

/**
 * Render image-only / scanned PDF pages and OCR them into plain text.
 * Used when pdf-parse returns empty text.
 */
export async function extractTextFromPdfWithOcr(
  pdfBytes: Buffer | Uint8Array,
  options: {
    onProgress?: (progress: PdfOcrProgress) => void | Promise<void>;
  } = {},
): Promise<string> {
  if (!isPdfOcrEnabled()) {
    throw new Error(
      "PDF 无可复制文字，且 OCR 已关闭（设置 PDF_OCR_ENABLED=1 可开启扫描件识别）。",
    );
  }

  const langs = getOcrLangs();
  const maxPages = getOcrMaxPages();
  const scale = getOcrScale();

  const library = await PDFiumLibrary.init();
  try {
    const document = await library.loadDocument(pdfBytes);
    try {
      const pageCount = document.getPageCount();
      if (pageCount <= 0) {
        throw new Error("PDF 页数为 0，无法 OCR。");
      }

      const totalPages = Math.min(pageCount, maxPages);
      const pageTexts: string[] = [];

      await withOcrWorker(langs, async (worker) => {
        for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
          const page = document.getPage(pageIndex);
          const text = await ocrPdfPage(worker, page, scale);
          if (text) {
            pageTexts.push(`【第 ${pageIndex + 1} 页】\n${text}`);
          }

          await options.onProgress?.({
            page: pageIndex + 1,
            totalPages,
            ratio: (pageIndex + 1) / totalPages,
          });
        }
      });

      const joined = pageTexts.join("\n\n").trim();
      if (!joined) {
        throw new Error(
          `OCR 未能识别出有效文字（已处理 ${totalPages}/${pageCount} 页）。可尝试提高 PDF_OCR_SCALE，或改用带文字层的 PDF。`,
        );
      }

      if (pageCount > maxPages) {
        return `${joined}\n\n（仅 OCR 前 ${maxPages} 页，全文共 ${pageCount} 页；可通过 PDF_OCR_MAX_PAGES 调整）`;
      }

      return joined;
    } finally {
      document.destroy();
    }
  } finally {
    library.destroy();
  }
}
