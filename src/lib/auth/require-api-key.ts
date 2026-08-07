import { NextResponse } from "next/server";

import {
  findApiKeyBySecret,
  touchApiKeyLastUsed,
} from "@/lib/api-keys";

export type ApiKeyAuth = {
  userId: string;
  apiKeyId: string;
};

export type RequireApiKeyResult =
  | { auth: ApiKeyAuth; error?: undefined }
  | { auth?: undefined; error: NextResponse };

function extractBearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export async function requireApiKey(
  request: Request,
): Promise<RequireApiKeyResult> {
  const token = extractBearer(request);
  if (!token) {
    return {
      error: NextResponse.json(
        { error: "缺少 API Key（Authorization: Bearer sk-ks-…）" },
        { status: 401 },
      ),
    };
  }

  const row = await findApiKeyBySecret(token);
  if (!row) {
    return {
      error: NextResponse.json({ error: "无效的 API Key" }, { status: 401 }),
    };
  }
  if (!row.enabled) {
    return {
      error: NextResponse.json({ error: "API Key 已禁用" }, { status: 403 }),
    };
  }

  void touchApiKeyLastUsed(row.id);

  return {
    auth: {
      userId: row.userId,
      apiKeyId: row.id,
    },
  };
}
