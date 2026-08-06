#!/usr/bin/env node
/**
 * Force re-parse all ready (and optionally failed) documents in a knowledge base.
 *
 * Usage:
 *   node scripts/reparse-kb.mjs --kb <knowledgeBaseId>
 *   node scripts/reparse-kb.mjs --kb <knowledgeBaseId> --include-failed
 *   BASE_URL=http://127.0.0.1:3000 node scripts/reparse-kb.mjs --kb <id>
 */
const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

async function main() {
  const kb = argValue("--kb");
  const includeFailed = process.argv.includes("--include-failed");

  if (!kb) {
    console.error(
      "Usage: node scripts/reparse-kb.mjs --kb <knowledgeBaseId> [--include-failed]",
    );
    process.exit(1);
  }

  const listRes = await fetch(
    `${baseUrl}/api/documents?knowledgeBaseId=${encodeURIComponent(kb)}`,
  );
  const listPayload = await listRes.json();
  if (!listRes.ok) {
    throw new Error(listPayload.error || "Failed to list documents");
  }

  const documents = listPayload.documents || [];
  const ids = documents
    .filter((doc) => {
      if (doc.status === "ready") {
        return true;
      }
      return includeFailed && doc.status === "failed";
    })
    .map((doc) => doc.id);

  if (!ids.length) {
    console.log("No matching documents to reparse.");
    return;
  }

  console.log(`Queueing ${ids.length} document(s) for reparse…`);

  // Batch API max 100
  for (let offset = 0; offset < ids.length; offset += 100) {
    const chunk = ids.slice(offset, offset + 100);
    const res = await fetch(`${baseUrl}/api/documents/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry", ids: chunk }),
    });
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload.error || "Batch retry failed");
    }
    console.log(
      `  batch ${offset / 100 + 1}: queued=${payload.queued ?? 0}, failed=${payload.failed?.length ?? 0}`,
    );
  }

  console.log("Done. Watch document progress in the knowledge library UI.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
