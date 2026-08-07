import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { createApiKey, listApiKeys } from "@/lib/api-keys";
import { isStaticSite } from "@/lib/site-mode";

export async function GET(request: Request) {
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
    const apiKeys = await listApiKeys(auth.user.id);
    return NextResponse.json({ apiKeys });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list API keys",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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
    const body = z
      .object({
        description: z.string().trim().max(200).optional(),
      })
      .parse(await request.json().catch(() => ({})));

    const created = await createApiKey(
      auth.user.id,
      body.description ?? "",
    );

    return NextResponse.json(
      {
        apiKey: {
          id: created.id,
          description: created.description,
          keyPrefix: created.keyPrefix,
          enabled: created.enabled,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
          lastUsedAt: created.lastUsedAt,
        },
        secret: created.secret,
      },
      { status: 201 },
    );
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
          error instanceof Error ? error.message : "Failed to create API key",
      },
      { status: 500 },
    );
  }
}
