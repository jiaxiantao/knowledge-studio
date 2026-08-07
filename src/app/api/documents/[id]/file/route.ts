import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/require-user";
import { getDocumentFile } from "@/lib/documents-service";
import {
  assertDocumentOwned,
  KnowledgeBaseAccessError,
} from "@/lib/ownership";
import { isStaticSite } from "@/lib/site-mode";

type RouteProps = {
  params: Promise<{ id: string }>;
};

function contentTypeForFormat(format: string) {
  switch (format) {
    case "pdf":
      return "application/pdf";
    case "md":
      return "text/markdown; charset=utf-8";
    case "txt":
      return "text/plain; charset=utf-8";
    case "html":
      return "text/html; charset=utf-8";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "bmp":
      return "image/bmp";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function encodeFilename(name: string) {
  return encodeURIComponent(name).replace(/['()]/g, escape);
}

export async function GET(request: Request, { params }: RouteProps) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support source file preview" },
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

    try {
      await access(file.absolutePath);
    } catch {
      return NextResponse.json(
        { error: "Source file missing on disk" },
        { status: 404 },
      );
    }

    const stream = Readable.toWeb(
      createReadStream(file.absolutePath),
    ) as ReadableStream;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentTypeForFormat(file.document.format),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeFilename(file.document.name)}`,
        "Cache-Control": "private, max-age=60",
      },
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
          error instanceof Error ? error.message : "Failed to open source file",
      },
      { status: 500 },
    );
  }
}
