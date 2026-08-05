import { after, NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteDocuments,
  processDocumentIngest,
  queueDocumentReprocess,
} from "@/lib/documents-service";
import { isStaticSite } from "@/lib/site-mode";

const batchSchema = z.object({
  action: z.enum(["delete", "retry"]),
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export async function POST(request: Request) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support batch document operations" },
      { status: 400 },
    );
  }

  try {
    const body = batchSchema.parse(await request.json());
    const ids = [...new Set(body.ids)];

    if (body.action === "delete") {
      const result = await deleteDocuments(ids);
      return NextResponse.json(result);
    }

    const documents = [];
    const failed: Array<{ id: string; error: string }> = [];
    const queuedIds: string[] = [];

    for (const id of ids) {
      try {
        const document = await queueDocumentReprocess(id, { force: true });
        documents.push(document);
        if (document.status === "pending") {
          queuedIds.push(id);
        }
      } catch (error) {
        failed.push({
          id,
          error: error instanceof Error ? error.message : "重试失败",
        });
      }
    }

    if (queuedIds.length) {
      after(() => {
        for (const id of queuedIds) {
          void processDocumentIngest(id);
        }
      });
    }

    return NextResponse.json({
      documents,
      queued: queuedIds.length,
      failed,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid batch payload" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Batch operation failed",
      },
      { status: 500 },
    );
  }
}
