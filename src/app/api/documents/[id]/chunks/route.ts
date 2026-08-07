import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/require-user";
import {
  createDocumentChunk,
  getDocument,
  listDocumentChunks,
} from "@/lib/documents-service";
import {
  assertDocumentOwned,
  KnowledgeBaseAccessError,
} from "@/lib/ownership";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    await assertDocumentOwned(id, auth.user.id);
    const document = await getDocument(id);

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const chunks = await listDocumentChunks(id);
    return NextResponse.json({ document, chunks });
  } catch (error) {
    if (error instanceof KnowledgeBaseAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to load chunks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteProps) {
  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    await assertDocumentOwned(id, auth.user.id);
    const document = await getDocument(id);

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      title?: string;
      content?: string;
      enabled?: boolean;
    };

    if (typeof body.content !== "string") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const chunk = await createDocumentChunk(id, {
      title: body.title,
      content: body.content,
      enabled: body.enabled,
    });

    return NextResponse.json({ chunk }, { status: 201 });
  } catch (error) {
    if (error instanceof KnowledgeBaseAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to create chunk";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
