import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import {
  createKnowledgeBase,
  listKnowledgeBases,
} from "@/lib/knowledge-bases-service";
import { isStaticSite } from "@/lib/site-mode";

export async function GET(request: Request) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support knowledge bases API" },
      { status: 400 },
    );
  }

  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const knowledgeBases = await listKnowledgeBases(auth.user.id);
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

  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = z
      .object({
        name: z.string().trim().min(1, "知识库名称不能为空").max(64),
        description: z.string().trim().max(200).optional(),
      })
      .parse(await request.json());

    const knowledgeBase = await createKnowledgeBase(auth.user.id, body);
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
