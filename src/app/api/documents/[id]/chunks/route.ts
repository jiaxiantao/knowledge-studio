import { NextResponse } from "next/server";

import {
  createDocumentChunk,
  getDocument,
  listDocumentChunks,
} from "@/lib/documents-service";

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

    const chunks = await listDocumentChunks(id);
    return NextResponse.json({ document, chunks });
  } catch {
    return NextResponse.json(
      { error: "Failed to load chunks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
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
    const message =
      error instanceof Error ? error.message : "Failed to create chunk";
    const status = message.includes("不能") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
