import { NextResponse } from "next/server";

import type { AuthUser } from "@/lib/auth/session";
import {
  getUserFromRequest,
  getUserFromRequestOrQuery,
} from "@/lib/auth/session";

export type RequireUserResult =
  | { user: AuthUser; error?: undefined }
  | { user?: undefined; error: NextResponse };

export async function requireUser(
  request: Request,
): Promise<RequireUserResult> {
  const user = await getUserFromRequest(request);
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "请先登录" },
        { status: 401 },
      ),
    };
  }
  return { user };
}

/** Same as requireUser, but also accepts `?access_token=` for EventSource. */
export async function requireUserAllowQuery(
  request: Request,
): Promise<RequireUserResult> {
  const user = await getUserFromRequestOrQuery(request);
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "请先登录" },
        { status: 401 },
      ),
    };
  }
  return { user };
}
