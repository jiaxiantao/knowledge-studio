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

async function runSqlFile(relativePath: string) {
  const sqlPath = join(process.cwd(), relativePath);
  const sql = readFileSync(sqlPath, "utf8");
  await prisma.$executeRawUnsafe(sql);
}

async function ensureExtensions() {
  await runSqlFile("prisma/sql/extensions.sql");
  await runSqlFile("prisma/sql/hybrid-search-indexes.sql");
}

async function main() {
  await ensureExtensions();
  console.log("Seeded extensions · vector + pg_trgm: enabled");
  console.log(
    "Default knowledge bases are created per user on first login/register.",
  );
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
