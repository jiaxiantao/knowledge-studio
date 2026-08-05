export type DocumentLifecycleStatus = "pending" | "parsing" | "ready" | "failed";

function getIngestStuckMs() {
  const minutes = Number(
    process.env.NEXT_PUBLIC_INGEST_STUCK_MINUTES ??
      process.env.INGEST_STUCK_MINUTES ??
      "15",
  );
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return 15 * 60 * 1000;
  }
  return minutes * 60 * 1000;
}

export function isDocumentIngestStuck(doc: {
  status: DocumentLifecycleStatus;
  updatedAt: string | Date;
}) {
  if (doc.status !== "pending" && doc.status !== "parsing") {
    return false;
  }

  const updated =
    typeof doc.updatedAt === "string" ? new Date(doc.updatedAt) : doc.updatedAt;
  return Date.now() - updated.getTime() > getIngestStuckMs();
}
