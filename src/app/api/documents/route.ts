import { after, NextResponse } from "next/server";

import {
  createUploadedDocument,
  listDocuments,
  processDocumentIngest,
} from "@/lib/documents-service";
import { getKnowledgeBase } from "@/lib/knowledge-bases-service";
import { validateUploadBasics } from "@/lib/upload-rules";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    const knowledgeBaseId = new URL(request.url).searchParams.get(
      "knowledgeBaseId",
    );
    const documents = await listDocuments(knowledgeBaseId ?? undefined);
    return NextResponse.json({ documents });
  } catch {
    return NextResponse.json(
      { error: "Failed to list documents" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const categoryRaw = form.get("category");
    const chunkConfigRaw = form.get("chunkConfig");
    const knowledgeBaseIdRaw = form.get("knowledgeBaseId");
    const category =
      typeof categoryRaw === "string" && categoryRaw.trim()
        ? categoryRaw.trim()
        : "默认类目";
    const knowledgeBaseId =
      typeof knowledgeBaseIdRaw === "string" && knowledgeBaseIdRaw.trim()
        ? knowledgeBaseIdRaw.trim()
        : undefined;

    if (knowledgeBaseId) {
      const knowledgeBase = await getKnowledgeBase(knowledgeBaseId);
      if (!knowledgeBase) {
        return NextResponse.json({ error: "知识库不存在" }, { status: 404 });
      }
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少上传文件" }, { status: 400 });
    }

    const basics = validateUploadBasics(file.name, file.size);
    if (!basics.ok) {
      return NextResponse.json({ error: basics.error }, { status: 400 });
    }

    let chunkConfig: unknown;
    if (typeof chunkConfigRaw === "string" && chunkConfigRaw.trim()) {
      try {
        chunkConfig = JSON.parse(chunkConfigRaw) as unknown;
      } catch {
        return NextResponse.json(
          { error: "chunkConfig 必须是合法 JSON" },
          { status: 400 },
        );
      }
    }

    const document = await createUploadedDocument(
      file,
      category,
      knowledgeBaseId,
      chunkConfig,
    );

    after(() => {
      void processDocumentIngest(document.id);
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload document",
      },
      { status: 500 },
    );
  }
}
