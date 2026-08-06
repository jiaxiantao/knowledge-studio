#!/usr/bin/env node
/**
 * Create one knowledge base per sample format and upload downloaded test files.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SAMPLES_DIR = path.join(
  homedir(),
  "Downloads",
  "knowledge-studio-upload-samples",
);

const FORMAT_LABELS = {
  pdf: "PDF 文档",
  doc: "DOC 文档",
  docx: "DOCX 文档",
  ppt: "PPT 演示",
  pptx: "PPTX 演示",
  xls: "XLS 表格",
  xlsx: "XLSX 表格",
  md: "Markdown",
  txt: "纯文本 TXT",
  html: "HTML 网页",
  png: "PNG 图片",
  jpg: "JPG 图片",
  jpeg: "JPEG 图片",
  gif: "GIF 图片",
  webp: "WebP 图片",
  bmp: "BMP 图片",
};

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? `HTTP ${response.status} ${url}`);
  }
  return payload;
}

async function listKnowledgeBases() {
  const payload = await apiJson(`${BASE_URL}/api/knowledge-bases`);
  return payload.knowledgeBases ?? [];
}

async function ensureKnowledgeBase(format, label) {
  const prefix = `格式测试 · ${label}`;
  const existing = (await listKnowledgeBases()).find((kb) => kb.name === prefix);
  if (existing) {
    console.log(`  知识库已存在: ${prefix} (${existing.id})`);
    return existing.id;
  }

  const payload = await apiJson(`${BASE_URL}/api/knowledge-bases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: prefix,
      description: `${label} 格式上传与切片测试样本（自动导入）`,
    }),
  });

  console.log(`  已创建知识库: ${prefix} (${payload.knowledgeBase.id})`);
  return payload.knowledgeBase.id;
}

async function uploadFile(filePath, knowledgeBaseId) {
  const buffer = await readFile(filePath);
  const filename = path.basename(filePath);
  const form = new FormData();
  form.append("file", new Blob([buffer]), filename);
  form.append("knowledgeBaseId", knowledgeBaseId);
  form.append("category", "测试样本");
  form.append(
    "chunkConfig",
    JSON.stringify({
      strategy: "smart",
      maxChars: 600,
      overlap: 64,
    }),
  );

  const response = await fetch(`${BASE_URL}/api/documents`, {
    method: "POST",
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? `上传失败 ${filename}`);
  }
  return payload.document;
}

async function main() {
  const formats = Object.keys(FORMAT_LABELS);
  console.log(`样本目录: ${SAMPLES_DIR}`);
  console.log(`API: ${BASE_URL}\n`);

  const summary = [];

  for (const format of formats) {
    const label = FORMAT_LABELS[format];
    const dir = path.join(SAMPLES_DIR, format);
    let files;
    try {
      files = (await readdir(dir)).filter((name) => !name.startsWith("."));
    } catch {
      console.log(`[${format}] 跳过 — 目录不存在`);
      continue;
    }

    if (!files.length) {
      console.log(`[${format}] 跳过 — 无文件`);
      continue;
    }

    console.log(`\n[${format}] ${label} — ${files.length} 个文件`);
    const knowledgeBaseId = await ensureKnowledgeBase(format, label);

    let ok = 0;
    const failed = [];
    for (const name of files.sort()) {
      const filePath = path.join(dir, name);
      try {
        const doc = await uploadFile(filePath, knowledgeBaseId);
        ok += 1;
        console.log(`  ✓ ${name} → ${doc.id}`);
      } catch (error) {
        failed.push({ name, error: error instanceof Error ? error.message : String(error) });
        console.log(
          `  ✗ ${name} — ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    summary.push({ format, label, total: files.length, ok, failed });
  }

  console.log("\n========== 汇总 ==========");
  for (const item of summary) {
    console.log(
      `${item.label}: ${item.ok}/${item.total} 已提交${item.failed.length ? `，失败 ${item.failed.length}` : ""}`,
    );
  }
  console.log("\n文档已在后台解析，可在各知识库文档列表查看进度。");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
