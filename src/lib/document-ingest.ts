import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

import type { DocumentFormat } from "@prisma/client";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (
  buffer: Buffer,
) => Promise<{ text?: string }>;

export function detectFormat(filename: string): DocumentFormat | null {
  const ext = path.extname(filename).toLowerCase().replace(".", "");
  if (ext === "md" || ext === "markdown") {
    return "md";
  }
  if (ext === "txt") {
    return "txt";
  }
  if (ext === "pdf") {
    return "pdf";
  }
  return null;
}

export async function extractTextFromFile(
  absolutePath: string,
  format: DocumentFormat,
): Promise<string> {
  if (format === "pdf") {
    const buffer = await readFile(absolutePath);
    const parsed = await pdfParse(buffer);
    return (parsed.text || "").trim();
  }

  const text = await readFile(absolutePath, "utf8");
  return text.trim();
}
