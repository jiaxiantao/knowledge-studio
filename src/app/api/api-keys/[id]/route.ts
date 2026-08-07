import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { deleteApiKey, updateApiKey } from "@/lib/api-keys";
import { isStaticSite } from "@/lib/site-mode";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support API keys" },
      { status: 400 },
    );
  }

  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await context.params;
    const body = z
      .object({
        description: z.string().trim().max(200).optional(),
        enabled: z.boolean().optional(),
      })
      .parse(await request.json());

    const apiKey = await updateApiKey(auth.user.id, id, body);
    if (!apiKey) {
      return NextResponse.json({ error: "API Key 不存在" }, { status: 404 });
    }

    return NextResponse.json({ apiKey });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update API key",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support API keys" },
      { status: 400 },
    );
  }

  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await context.params;
    const deleted = await deleteApiKey(auth.user.id, id);
    if (!deleted) {
      return NextResponse.json({ error: "API Key 不存在" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete API key",
      },
      { status: 500 },
    );
  }
}
