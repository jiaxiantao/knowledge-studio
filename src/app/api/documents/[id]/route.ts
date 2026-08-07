import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/require-user";
import { deleteDocument, getDocument } from "@/lib/documents-service";
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

    return NextResponse.json({ document });
  } catch (error) {
    if (error instanceof KnowledgeBaseAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to load document" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    await assertDocumentOwned(id, auth.user.id);
    await deleteDocument(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof KnowledgeBaseAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof Error && error.message === "Document not found") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
