import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getDb } from "../src/lib/db";

function requireDb() {
  const prisma = getDb();

  if (!prisma) {
    throw new Error("DATABASE_URL is not configured");
  }

  return prisma;
}

const prisma = requireDb();

async function ensureExtensions() {
  const sqlPath = join(process.cwd(), "prisma/sql/extensions.sql");
  const sql = readFileSync(sqlPath, "utf8");
  await prisma.$executeRawUnsafe(sql);
}

async function ensureDefaultKnowledgeBase() {
  const existing = await prisma.knowledgeBase.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return existing;
  }

  return prisma.knowledgeBase.create({
    data: {
      name: "我的知识库",
      description: "本地轻量 RAG 知识库（文件上传 → 切片 → 向量检索 → 问答）",
    },
  });
}

async function main() {
  await ensureExtensions();
  const kb = await ensureDefaultKnowledgeBase();
  console.log(`Seeded knowledge base · kb=${kb.name} · vector: enabled`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
