import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

export type PdfJsExtractProgress = {
  page: number;
  totalPages: number;
  ratio: number;
};

function resolvePdfJsPaths() {
  const pkgRoot = path.dirname(require.resolve("pdfjs-dist/package.json"));
  return {
    cMapUrl: path.join(pkgRoot, "cmaps/"),
    standardFontDataUrl: path.join(pkgRoot, "standard_fonts/"),
  };
}

function pageTextFromItems(
  items: Array<{ str?: string; hasEOL?: boolean }>,
) {
  return items
    .map((item) => {
      if (!item.str) {
        return "";
      }
      return item.hasEOL ? `${item.str}\n` : item.str;
    })
    .join("")
    .replace(/\u0000/g, "")
    .trim();
}

/**
 * Page-by-page PDF text via pdfjs-dist (more complete than pdf-parse on many textbooks).
 */
export async function extractTextFromPdfWithPdfJs(
  pdfBytes: Buffer | Uint8Array,
  options: {
    onProgress?: (progress: PdfJsExtractProgress) => void | Promise<void>;
  } = {},
): Promise<{ text: string; pageCount: number; pageTexts: string[] }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { cMapUrl, standardFontDataUrl } = resolvePdfJsPaths();
  const data = pdfBytes instanceof Buffer ? new Uint8Array(pdfBytes) : pdfBytes;

  const loadingTask = pdfjs.getDocument({
    data,
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
    useSystemFonts: true,
    disableFontFace: true,
  });

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pageTexts: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = pageTextFromItems(
        content.items as Array<{ str?: string; hasEOL?: boolean }>,
      );
      pageTexts.push(pageText);
      page.cleanup();

      await options.onProgress?.({
        page: pageNumber,
        totalPages,
        ratio: pageNumber / totalPages,
      });
    }
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }

  return {
    text: pageTexts.filter(Boolean).join("\n\n").trim(),
    pageCount: totalPages,
    pageTexts,
  };
}

/** Legacy pdf-parse helper for comparison fallback. */
export async function extractTextFromPdfWithPdfParse(
  pdfBytes: Buffer,
): Promise<{ text: string; pageCount: number }> {
  const pdfParse = require("pdf-parse") as (
    buffer: Buffer,
  ) => Promise<{ text?: string; numpages?: number }>;
  const parsed = await pdfParse(pdfBytes);
  return {
    text: (parsed.text || "").trim(),
    pageCount: Number(parsed.numpages) || 0,
  };
}

export function scorePdfExtraction(text: string, pageCount: number) {
  const normalized = text.replace(/\s+/g, "");
  const length = normalized.length;
  const charsPerPage = pageCount > 0 ? length / pageCount : length;
  return { length, charsPerPage };
}

export function pickBetterPdfText(
  candidates: Array<{ label: "pdfjs" | "pdf-parse"; text: string; pageCount: number }>,
) {
  if (!candidates.length) {
    return { text: "", pageCount: 0, source: "none" as const };
  }

  const ranked = candidates
    .map((item) => ({
      ...item,
      score: scorePdfExtraction(item.text, item.pageCount),
    }))
    .sort((left, right) => {
      if (right.score.length !== left.score.length) {
        return right.score.length - left.score.length;
      }
      return right.score.charsPerPage - left.score.charsPerPage;
    });

  const best = ranked[0];
  return {
    text: best.text,
    pageCount: best.pageCount,
    source: best.label,
  };
}

/** True when average text density suggests a partial/broken text layer. */
export function needsPerPageOcrSupplement(text: string, pageCount: number) {
  if (pageCount <= 0) {
    return true;
  }
  const { charsPerPage } = scorePdfExtraction(text, pageCount);
  return charsPerPage < 120;
}
