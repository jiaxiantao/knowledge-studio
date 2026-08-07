import type { AuthUser } from "@/lib/auth/jwt";
import { verifyAuthToken } from "@/lib/auth/jwt";

export type { AuthUser };

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function extractQueryToken(request: Request): string | null {
  try {
    const url = new URL(request.url);
    return url.searchParams.get("access_token")?.trim() || null;
  } catch {
    return null;
  }
}

/** Resolve user from Authorization Bearer token. */
export async function getUserFromRequest(
  request: Request,
): Promise<AuthUser | null> {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }
  return verifyAuthToken(token);
}

/**
 * Resolve user from Bearer header, or `?access_token=` (SSE / EventSource).
 */
export async function getUserFromRequestOrQuery(
  request: Request,
): Promise<AuthUser | null> {
  const bearer = extractBearerToken(request);
  if (bearer) {
    return verifyAuthToken(bearer);
  }
  const queryToken = extractQueryToken(request);
  if (!queryToken) {
    return null;
  }
  return verifyAuthToken(queryToken);
}
