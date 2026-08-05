import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createKnowledgeBase,
  listKnowledgeBases,
} from "@/lib/knowledge-bases-service";
import { isStaticSite } from "@/lib/site-mode";

export async function GET() {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support knowledge bases API" },
      { status: 400 },
    );
  }

  try {
    const knowledgeBases = await listKnowledgeBases();
    return NextResponse.json({ knowledgeBases });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list knowledge bases",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support knowledge bases API" },
      { status: 400 },
    );
  }

  try {
    const body = z
      .object({
        name: z.string().trim().min(1, "知识库名称不能为空").max(64),
        description: z.string().trim().max(200).optional(),
      })
      .parse(await request.json());

    const knowledgeBase = await createKnowledgeBase(body);
    return NextResponse.json({ knowledgeBase }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid knowledge base" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create knowledge base",
      },
      { status: 500 },
    );
  }
}
