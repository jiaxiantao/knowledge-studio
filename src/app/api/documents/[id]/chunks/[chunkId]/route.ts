import { NextResponse } from "next/server";

import {
  deleteDocumentChunk,
  getDocumentChunk,
  updateDocumentChunk,
} from "@/lib/documents-service";

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
  try {
    const { id, chunkId } = await params;
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
    const message =
      error instanceof Error ? error.message : "Failed to update chunk";
    const status =
      message.includes("not found") || message.includes("不能") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const { id, chunkId } = await params;
    const owned = await assertChunkBelongsToDocument(id, chunkId);
    if (owned.error) {
      return owned.error;
    }

    await deleteDocumentChunk(chunkId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete chunk";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
