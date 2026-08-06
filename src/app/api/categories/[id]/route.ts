import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteCategory, renameCategory } from "@/lib/categories-service";
import { isStaticSite } from "@/lib/site-mode";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support categories API" },
      { status: 400 },
    );
  }

  try {
    const { id } = await params;
    const body = z
      .object({
        name: z.string().trim().min(1, "类目名称不能为空").max(64),
      })
      .parse(await request.json());

    const category = await renameCategory(id, body.name);
    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid category" },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to rename category";
    const status =
      message.includes("不存在") ||
      message.includes("不可") ||
      message.includes("已存在") ||
      message.includes("不能")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support categories API" },
      { status: 400 },
    );
  }

  try {
    const { id } = await params;
    await deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete category";
    const status =
      message.includes("不存在") || message.includes("不可") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
