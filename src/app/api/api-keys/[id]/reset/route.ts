import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/require-user";
import { resetApiKey } from "@/lib/api-keys";
import { isStaticSite } from "@/lib/site-mode";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
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
    const created = await resetApiKey(auth.user.id, id);
    if (!created) {
      return NextResponse.json({ error: "API Key 不存在" }, { status: 404 });
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reset API key",
      },
      { status: 500 },
    );
  }
}
