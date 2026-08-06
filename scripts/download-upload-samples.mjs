#!/usr/bin/env node
/**
 * Download / generate sample files for Knowledge Studio upload testing.
 * Output: ~/Downloads/knowledge-studio-upload-samples/{format}/
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const OUT_DIR = path.join(
  homedir(),
  "Downloads",
  "knowledge-studio-upload-samples",
);

const SAMPLE_FILES =
  "https://raw.githubusercontent.com/iamahsanmehmood/sample-files/main";
const DELIVR = "https://raw.githubusercontent.com/delivr-to/file-samples/main/samples";
const JONAS = "https://raw.githubusercontent.com/jonasclaes/test-data/main";
const FILESAMPLES = "https://filesamples.com/samples/document";

/** @type {Record<string, Array<{ url: string; name?: string }>>} */
const DOWNLOADS = {
  pdf: [
    { url: `${SAMPLE_FILES}/documents/sample.pdf`, name: "github-sample.pdf" },
    { url: `${FILESAMPLES}/pdf/sample1.pdf`, name: "filesamples-01.pdf" },
    { url: `${FILESAMPLES}/pdf/sample2.pdf`, name: "filesamples-02.pdf" },
    { url: `${FILESAMPLES}/pdf/sample3.pdf`, name: "filesamples-03.pdf" },
    { url: `${JONAS}/pdfs/basic-en.pdf`, name: "basic-en.pdf" },
    { url: `${JONAS}/pdfs/basic-de.pdf`, name: "basic-de.pdf" },
    {
      url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      name: "w3c-dummy.pdf",
    },
  ],
  doc: [
    { url: `${SAMPLE_FILES}/documents/sample.doc`, name: "github-sample.doc" },
    { url: `${FILESAMPLES}/doc/sample1.doc`, name: "filesamples-01.doc" },
    { url: `${FILESAMPLES}/doc/sample2.doc`, name: "filesamples-02.doc" },
    { url: `${DELIVR}/test_doc.doc`, name: "delivr-test.doc" },
    { url: `${DELIVR}/test_encrypted_doc.doc`, name: "delivr-encrypted.doc" },
  ],
  docx: [
    { url: `${SAMPLE_FILES}/documents/sample.docx`, name: "github-sample.docx" },
    { url: `${FILESAMPLES}/docx/sample1.docx`, name: "filesamples-01.docx" },
    { url: `${FILESAMPLES}/docx/sample2.docx`, name: "filesamples-02.docx" },
    { url: `${FILESAMPLES}/docx/sample3.docx`, name: "filesamples-03.docx" },
    { url: `${DELIVR}/test_docx.docx`, name: "delivr-test.docx" },
    {
      url: "https://cdn.syncfusion.com/content/word-processing-doc/docx/Sample.docx",
      name: "syncfusion-sample.docx",
    },
  ],
  ppt: [
    { url: `${SAMPLE_FILES}/documents/sample.ppt`, name: "github-sample.ppt" },
    { url: `${FILESAMPLES}/ppt/sample1.ppt`, name: "filesamples-01.ppt" },
    { url: `${FILESAMPLES}/ppt/sample2.ppt`, name: "filesamples-02.ppt" },
    { url: `${FILESAMPLES}/ppt/sample3.ppt`, name: "filesamples-03.ppt" },
    { url: `${DELIVR}/test_ppt.ppt`, name: "delivr-test.ppt" },
  ],
  pptx: [
    { url: `${SAMPLE_FILES}/documents/sample.pptx`, name: "github-sample.pptx" },
    { url: `${DELIVR}/test_pptx.pptx`, name: "delivr-test.pptx" },
    {
      url: "https://cdn.syncfusion.com/content/PDFViewer/flutter-samples/sample-files/sample.pptx",
      name: "syncfusion-sample.pptx",
    },
    { url: `${DELIVR}/pptx_embedded_bat.pptx`, name: "delivr-embedded.pptx" },
    { url: `${DELIVR}/test_encrypted_pptx.pptx`, name: "delivr-encrypted.pptx" },
  ],
  xls: [
    { url: `${SAMPLE_FILES}/spreadsheets/sample.xls`, name: "github-sample.xls" },
    { url: `${FILESAMPLES}/xls/sample1.xls`, name: "filesamples-01.xls" },
    { url: `${FILESAMPLES}/xls/sample2.xls`, name: "filesamples-02.xls" },
    { url: `${FILESAMPLES}/xls/sample3.xls`, name: "filesamples-03.xls" },
    { url: `${DELIVR}/test_xls_97_2003.xls`, name: "delivr-97-2003.xls" },
    { url: `${DELIVR}/test_xls_95.xls`, name: "delivr-95.xls" },
  ],
  xlsx: [
    { url: `${SAMPLE_FILES}/spreadsheets/sample.xlsx`, name: "github-sample.xlsx" },
    { url: `${FILESAMPLES}/xlsx/sample1.xlsx`, name: "filesamples-01.xlsx" },
    { url: `${FILESAMPLES}/xlsx/sample2.xlsx`, name: "filesamples-02.xlsx" },
    { url: `${FILESAMPLES}/xlsx/sample3.xlsx`, name: "filesamples-03.xlsx" },
    { url: `${DELIVR}/test_xlsx.xlsx`, name: "delivr-test.xlsx" },
  ],
  png: [
    { url: `${SAMPLE_FILES}/images/sample.png`, name: "github-sample.png" },
    { url: `${JONAS}/images/square/gradient-aa.png`, name: "gradient-aa.png" },
    { url: `${JONAS}/images/square/gradient-ab.png`, name: "gradient-ab.png" },
    { url: `${JONAS}/images/square/gradient-ae.png`, name: "gradient-ae.png" },
    { url: `${JONAS}/images/square/gradient-af.png`, name: "gradient-af.png" },
    { url: `${JONAS}/images/square/gradient-ak.png`, name: "gradient-ak.png" },
    { url: "https://placehold.co/800x600/png?text=PNG+Sample+6", name: "placehold-06.png" },
  ],
  jpg: [
    { url: `${SAMPLE_FILES}/images/sample.jpg`, name: "github-sample.jpg" },
    { url: "https://picsum.photos/id/10/800/600.jpg", name: "picsum-10.jpg" },
    { url: "https://picsum.photos/id/20/800/600.jpg", name: "picsum-20.jpg" },
    { url: "https://picsum.photos/id/30/800/600.jpg", name: "picsum-30.jpg" },
    { url: "https://picsum.photos/id/40/800/600.jpg", name: "picsum-40.jpg" },
    { url: "https://placehold.co/800x600/jpg?text=JPG+Sample+6", name: "placehold-06.jpg" },
  ],
  jpeg: [
    { url: `${SAMPLE_FILES}/images/sample.jpeg`, name: "github-sample.jpeg" },
    { url: "https://picsum.photos/id/50/800/600.jpg", name: "picsum-50.jpeg" },
    { url: "https://picsum.photos/id/60/800/600.jpg", name: "picsum-60.jpeg" },
    { url: "https://picsum.photos/id/70/800/600.jpg", name: "picsum-70.jpeg" },
    { url: "https://picsum.photos/id/80/800/600.jpg", name: "picsum-80.jpeg" },
    { url: "https://placehold.co/800x600/jpeg?text=JPEG+Sample+6", name: "placehold-06.jpeg" },
  ],
  gif: [
    { url: `${SAMPLE_FILES}/images/sample.gif`, name: "github-sample.gif" },
    { url: "https://placehold.co/600x400/gif?text=GIF+02", name: "placehold-02.gif" },
    { url: "https://placehold.co/600x400/gif?text=GIF+03", name: "placehold-03.gif" },
    { url: "https://placehold.co/600x400/gif?text=GIF+04", name: "placehold-04.gif" },
    { url: "https://placehold.co/600x400/gif?text=GIF+05", name: "placehold-05.gif" },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif",
      name: "wikimedia-earth.gif",
    },
  ],
  webp: [
    { url: `${SAMPLE_FILES}/images/sample.webp`, name: "github-sample.webp" },
    { url: "https://placehold.co/800x600/webp?text=WEBP+02", name: "placehold-02.webp" },
    { url: "https://placehold.co/800x600/webp?text=WEBP+03", name: "placehold-03.webp" },
    { url: "https://placehold.co/800x600/webp?text=WEBP+04", name: "placehold-04.webp" },
    { url: "https://placehold.co/800x600/webp?text=WEBP+05", name: "placehold-05.webp" },
    { url: "https://placehold.co/800x600/webp?text=WEBP+06", name: "placehold-06.webp" },
  ],
  bmp: [
    { url: `${SAMPLE_FILES}/images/sample.bmp`, name: "github-sample.bmp" },
    { url: `${JONAS}/images/square/gradient-aa.png`, name: "gradient-aa.bmp" },
    { url: `${JONAS}/images/square/gradient-ae.png`, name: "gradient-ae.bmp" },
    { url: `${JONAS}/images/square/gradient-am.png`, name: "gradient-am.bmp" },
    { url: `${JONAS}/images/square/gradient-an.png`, name: "gradient-an.bmp" },
  ],
};

async function downloadFile(url, destPath, options = {}) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: options.signal,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) KnowledgeStudioSampleDownloader/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 64) {
    throw new Error(`文件过小 (${buffer.length} bytes)，可能不是有效样本`);
  }

  await writeFile(destPath, buffer);
  return buffer.length;
}

async function downloadBmpItem(item, dir) {
  const filename = item.name ?? path.basename(new URL(item.url).pathname);
  const dest = path.join(dir, filename);

  if (filename.endsWith(".bmp") && item.url.includes("/square/")) {
    const pngName = filename.replace(/\.bmp$/, ".png");
    const pngDest = path.join(dir, `.tmp-${pngName}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      await downloadFile(item.url, pngDest, { signal: controller.signal });
      await new Promise((resolve, reject) => {
        const { execFile } = require("node:child_process");
        execFile("/usr/bin/sips", ["-s", "format", "bmp", pngDest, "--out", dest], (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(undefined);
        });
      });
      const { unlink } = await import("node:fs/promises");
      await unlink(pngDest).catch(() => undefined);
      const { stat } = await import("node:fs/promises");
      return (await stat(dest)).size;
    } finally {
      clearTimeout(timeout);
    }
  }

  return downloadFile(item.url, dest);
}

function generateMarkdown(index) {
  const topics = [
    "项目管理基础",
    "敏捷开发实践",
    "系统架构设计",
    "数据库索引优化",
    "混合检索与 RAG",
  ];
  const topic = topics[index - 1] ?? `主题 ${index}`;

  return `# ${topic}（样本 ${index}）

## 概述

本文档用于 Knowledge Studio 上传与切片测试。第 ${index} 号 Markdown 样本包含标题、段落与列表，便于验证**按标题切分**与**智能切分**策略。

## 核心要点

1. 段落应尽量语义完整，避免在句子中间截断。
2. 列表项可以单独成为切片边界。
3. 代码块与引用块应保留上下文。

### 子章节 A

这是子章节 A 的正文内容。Lorem ipsum dolor sit amet，用于填充足够字符以触发多切片场景。

> 引用块：检索系统应同时支持向量召回与关键词召回。

### 子章节 B

| 字段 | 说明 |
|------|------|
| chunk | 切片 |
| embedding | 向量 |
| score | 相关度 |

## 总结

样本 ${index} 结束。`;
}

function generateText(index) {
  const bodies = [
    "纯文本样本一：短段落，用于测试较小 maxChars 时的切片数量。",
    "纯文本样本二：包含多段文字。\n\n第二段开始讨论文档解析流程：上传、提取、清洗、切片、向量化。\n\n第三段补充 OCR 与 PDF 逐页提取。",
    "纯文本样本三：" + "重复字符测试。".repeat(40),
    "纯文本样本四：编号列表\n1. 第一步上传\n2. 第二步索引设置\n3. 第三步完成解析\n4. 第四步检索验证",
    "纯文本样本五：中英混排 Knowledge Studio 本地 RAG 控制台，支持 pdf docx xlsx png 等格式。",
  ];
  return `${bodies[index - 1] ?? `纯文本样本 ${index}`}\n\n---\n文件编号: ${index}\n`;
}

function generateHtml(index) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>HTML 样本 ${index}</title>
</head>
<body>
  <h1>HTML 测试文档 ${index}</h1>
  <p>用于验证 HTML 去标签与切片。本页包含<strong>加粗</strong>与<em>斜体</em>。</p>
  <h2>第二节</h2>
  <ul>
    <li>列表项 A-${index}</li>
    <li>列表项 B-${index}</li>
    <li>列表项 C-${index}</li>
  </ul>
  <p>段落内容：` + "测试文字。".repeat(20 + index * 5) + `</p>
</body>
</html>`;
}

function generateXlsxFiles(dir) {
  const results = [];
  for (let i = 1; i <= 5; i += 1) {
    const rows = [
      ["ID", "名称", "类别", "备注"],
      ...Array.from({ length: 10 + i * 5 }, (_, row) => [
        row + 1,
        `条目-${i}-${row + 1}`,
        `类目-${(row % 3) + 1}`,
        `第 ${i} 号生成表格，行 ${row + 1}`,
      ]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, `Sheet${i}`);
    const filename = `generated-${String(i).padStart(2, "0")}.xlsx`;
    const filepath = path.join(dir, filename);
    XLSX.writeFile(book, filepath);
    results.push({ file: filename, bytes: XLSX.write(book, { type: "buffer" }).length });
  }
  return results;
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function downloadFormat(format, items, minCount = 5) {
  const dir = path.join(OUT_DIR, format);
  await ensureDir(dir);

  const results = [];
  let saved = 0;

  for (const item of items) {
    if (saved >= minCount) {
      break;
    }

    const filename = item.name ?? path.basename(new URL(item.url).pathname);
    const dest = path.join(dir, filename);

    try {
      const bytes =
        format === "bmp"
          ? await downloadBmpItem(item, dir)
          : await downloadFile(item.url, dest);
      results.push({ file: filename, bytes, ok: true });
      saved += 1;
      process.stdout.write(`  ✓ ${format}/${filename} (${bytes} bytes)\n`);
    } catch (error) {
      results.push({
        file: filename,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
      process.stdout.write(
        `  ✗ ${format}/${filename} — ${error instanceof Error ? error.message : error}\n`,
      );
    }
  }

  return { format, saved, results };
}

async function generatePlainFormats() {
  for (const format of ["md", "txt", "html"]) {
    const dir = path.join(OUT_DIR, format);
    await ensureDir(dir);
    for (let i = 1; i <= 5; i += 1) {
      const name = `generated-${String(i).padStart(2, "0")}.${format}`;
      const content =
        format === "md"
          ? generateMarkdown(i)
          : format === "txt"
            ? generateText(i)
            : generateHtml(i);
      await writeFile(path.join(dir, name), content, "utf8");
      process.stdout.write(`  ✓ ${format}/${name} (generated)\n`);
    }
  }
}

async function main() {
  console.log(`输出目录: ${OUT_DIR}\n`);
  await ensureDir(OUT_DIR);

  console.log("生成纯文本样本 (md / txt / html)...");
  await generatePlainFormats();

  console.log("\n下载各格式样本...");
  const summary = [];
  for (const [format, items] of Object.entries(DOWNLOADS)) {
    console.log(`\n[${format}]`);
    const result = await downloadFormat(format, items, 5);
    summary.push(result);
  }

  console.log("\n额外生成 xlsx 表格样本...");
  const xlsxDir = path.join(OUT_DIR, "xlsx");
  await ensureDir(xlsxDir);
  for (const item of generateXlsxFiles(xlsxDir)) {
    process.stdout.write(`  ✓ xlsx/${item.file} (generated, ${item.bytes} bytes)\n`);
  }

  const readme = `# Knowledge Studio 上传测试样本

生成时间: ${new Date().toISOString()}

每种格式至少 5 个文件，用于测试不同文档的切片与解析效果。

## 目录

| 格式 | 说明 |
|------|------|
| pdf / doc / docx / ppt / pptx / xls / xlsx | 办公文档 |
| md / txt / html | 纯文本（本地生成） |
| png / jpg / jpeg / gif / webp / bmp | 图片（含 OCR 测试） |

## 来源

- [iamahsanmehmood/sample-files](https://github.com/iamahsanmehmood/sample-files)
- [filesamples.com](https://filesamples.com)
- [jonasclaes/test-data](https://github.com/jonasclaes/test-data)
- [delivr-to/file-samples](https://github.com/delivr-to/file-samples)
- placehold.co / picsum.photos / 本地生成

## 下载汇总

${summary
  .map((item) => `- **${item.format}**: 成功 ${item.saved} 个`)
  .join("\n")}
`;

  await writeFile(path.join(OUT_DIR, "README.md"), readme, "utf8");
  console.log(`\n完成。请查看: ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
