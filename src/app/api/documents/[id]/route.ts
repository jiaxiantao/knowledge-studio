import { NextResponse } from "next/server";

import { deleteDocument, getDocument } from "@/lib/documents-service";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const document = await getDocument(id);

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch {
    return NextResponse.json(
      { error: "Failed to load document" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    await deleteDocument(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Document not found") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
