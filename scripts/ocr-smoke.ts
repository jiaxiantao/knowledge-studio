import { readFileSync } from "node:fs";

import { extractTextFromPdfWithOcr } from "../src/lib/pdf-ocr";

async function main() {
  process.env.PDF_OCR_MAX_PAGES = "1";

  const buf = readFileSync("data/uploads/1785982557373-ff213ae6.pdf");
  const text = await extractTextFromPdfWithOcr(buf, {
    onProgress: (progress) => console.log(progress),
  });
  console.log("len", text.length);
  console.log(text.slice(0, 300));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
