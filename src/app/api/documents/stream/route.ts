import { requireUserAllowQuery } from "@/lib/auth/require-user";
import { subscribeDocumentProgress } from "@/lib/document-progress-events";
import { listDocuments } from "@/lib/documents-service";
import { getKnowledgeBase } from "@/lib/knowledge-bases-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;

export async function GET(request: Request) {
  const auth = await requireUserAllowQuery(request);
  if (auth.error) {
    return auth.error;
  }

  const knowledgeBaseId = new URL(request.url).searchParams.get(
    "knowledgeBaseId",
  );

  if (!knowledgeBaseId?.trim()) {
    return new Response(JSON.stringify({ error: "缺少 knowledgeBaseId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const knowledgeBase = await getKnowledgeBase(
    knowledgeBaseId.trim(),
    auth.user.id,
  );
  if (!knowledgeBase) {
    return new Response(JSON.stringify({ error: "知识库不存在" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) {
          return;
        }

        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send("connected", { knowledgeBaseId: knowledgeBase.id });

      const activeDocuments = (
        await listDocuments(auth.user.id, knowledgeBase.id)
      ).filter(
        (doc) => doc.status === "pending" || doc.status === "parsing",
      );
      for (const document of activeDocuments) {
        send("document", { document });
      }

      unsubscribe = subscribeDocumentProgress(knowledgeBase.id, (document) => {
        send("document", { document });
      });

      heartbeat = setInterval(() => {
        if (closed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          closed = true;
          if (heartbeat) {
            clearInterval(heartbeat);
          }
        }
      }, HEARTBEAT_MS);
    },
    cancel() {
      closed = true;
      unsubscribe?.();
      if (heartbeat) {
        clearInterval(heartbeat);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
