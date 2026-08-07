import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getDb } from "../src/lib/db";

async function main() {
  const prisma = getDb();

  if (!prisma) {
    throw new Error("DATABASE_URL is not configured");
  }

  const sqlPath = join(process.cwd(), "prisma/sql/extensions.sql");
  const sql = readFileSync(sqlPath, "utf8");
  await prisma.$executeRawUnsafe(sql);
  console.log("Enabled PostgreSQL extensions: vector, pg_trgm");
}

main()
  .then(async () => {
    const prisma = getDb();
    await prisma?.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    const prisma = getDb();
    await prisma?.$disconnect();
    process.exit(1);
  });
