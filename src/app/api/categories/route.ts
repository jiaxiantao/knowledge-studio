import { NextResponse } from "next/server";
import { z } from "zod";

import { createCategory, listCategories } from "@/lib/categories-service";
import { isStaticSite } from "@/lib/site-mode";

export async function GET(request: Request) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support categories API" },
      { status: 400 },
    );
  }

  try {
    const knowledgeBaseId = new URL(request.url).searchParams.get(
      "knowledgeBaseId",
    );
    const categories = await listCategories(knowledgeBaseId ?? undefined);
    return NextResponse.json({ categories });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list categories",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support categories API" },
      { status: 400 },
    );
  }

  try {
    const body = z
      .object({
        name: z.string().trim().min(1, "类目名称不能为空").max(64),
        knowledgeBaseId: z.string().trim().min(1).optional(),
      })
      .parse(await request.json());

    const category = await createCategory(body.name, body.knowledgeBaseId);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid category" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create category",
      },
      { status: 500 },
    );
  }
}
