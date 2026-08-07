import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/require-user";
import { buildDocumentPreview } from "@/lib/document-preview-server";
import { getDocumentFile } from "@/lib/documents-service";
import {
  assertDocumentOwned,
  KnowledgeBaseAccessError,
} from "@/lib/ownership";
import { isStaticSite } from "@/lib/site-mode";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function GET(request: Request, { params }: RouteProps) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support document preview" },
      { status: 400 },
    );
  }

  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    await assertDocumentOwned(id, auth.user.id);
    const file = await getDocumentFile(id);

    if (!file) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const preview = await buildDocumentPreview(file.document, file.absolutePath);

    return NextResponse.json({
      document: file.document,
      preview,
    });
  } catch (error) {
    if (error instanceof KnowledgeBaseAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to build preview",
      },
      { status: 500 },
    );
  }
}
