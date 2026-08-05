import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { getDocumentFile } from "@/lib/documents-service";
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
    default:
      return "application/octet-stream";
  }
}

function encodeFilename(name: string) {
  return encodeURIComponent(name).replace(/['()]/g, escape);
}

export async function GET(_request: Request, { params }: RouteProps) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support source file preview" },
      { status: 400 },
    );
  }

  try {
    const { id } = await params;
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
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to open source file",
      },
      { status: 500 },
    );
  }
}
