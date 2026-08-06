import "dotenv/config";
import { runRagEval } from "../src/lib/rag-eval/run-eval";
import { getReadyDb } from "../src/lib/db";

async function main() {
  const db = await getReadyDb();
  if (!db) {
    throw new Error("DB unavailable");
  }
  const soft = await db.knowledgeBase.findFirst({
    where: { name: { contains: "软考" } },
  });
  const blog = await db.knowledgeBase.findFirst({
    where: { name: { contains: "技术博客" } },
  });

  if (soft) {
    const softResult = await runRagEval({
      caseSet: "soft-exam",
      knowledgeBaseIds: [soft.id],
      topK: 5,
    });
    console.log("\nsoft-exam", softResult.summary);
    for (const row of softResult.results) {
      console.log(
        row.passed ? "✓" : "✗",
        row.expectHit ? "hit" : "rej",
        row.id,
        "top=" + (row.topScore ?? "∅"),
        "rank=" + (row.firstRelevantRank ?? "-"),
        row.hits[0]?.documentName?.slice(0, 36) ?? "∅",
      );
    }
  }

  if (blog) {
    const blogResult = await runRagEval({
      caseSet: "tech-blog",
      knowledgeBaseIds: [blog.id],
      topK: 5,
    });
    console.log("\ntech-blog", blogResult.summary);
    for (const row of blogResult.results) {
      console.log(
        row.passed ? "✓" : "✗",
        row.expectHit ? "hit" : "rej",
        row.id,
        "top=" + (row.topScore ?? "∅"),
        "rank=" + (row.firstRelevantRank ?? "-"),
        row.hits[0]?.documentName?.slice(0, 36) ?? "∅",
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
