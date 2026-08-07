import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/require-user";
import {
  deleteDocumentChunk,
  getDocumentChunk,
  updateDocumentChunk,
} from "@/lib/documents-service";
import {
  assertDocumentOwned,
  KnowledgeBaseAccessError,
} from "@/lib/ownership";

type RouteProps = {
  params: Promise<{ id: string; chunkId: string }>;
};

async function assertChunkBelongsToDocument(documentId: string, chunkId: string) {
  const chunk = await getDocumentChunk(chunkId);
  if (!chunk) {
    return { error: NextResponse.json({ error: "Chunk not found" }, { status: 404 }) };
  }
  if (chunk.documentId !== documentId) {
    return {
      error: NextResponse.json({ error: "Chunk does not belong to document" }, { status: 404 }),
    };
  }
  return { chunk };
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id, chunkId } = await params;
    await assertDocumentOwned(id, auth.user.id);
    const owned = await assertChunkBelongsToDocument(id, chunkId);
    if (owned.error) {
      return owned.error;
    }

    const body = (await request.json()) as {
      title?: string;
      content?: string;
      enabled?: boolean;
    };

    const chunk = await updateDocumentChunk(chunkId, {
      title: body.title,
      content: body.content,
      enabled: body.enabled,
    });

    return NextResponse.json({ chunk });
  } catch (error) {
    if (error instanceof KnowledgeBaseAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to update chunk";
    const status =
      message.includes("not found") || message.includes("不能") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id, chunkId } = await params;
    await assertDocumentOwned(id, auth.user.id);
    const owned = await assertChunkBelongsToDocument(id, chunkId);
    if (owned.error) {
      return owned.error;
    }

    await deleteDocumentChunk(chunkId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof KnowledgeBaseAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to delete chunk";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
