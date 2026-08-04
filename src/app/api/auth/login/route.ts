import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_AUTH_COOKIE,
  AdminAuthError,
  createAdminToken,
  verifyAdminLogin,
} from "@/lib/admin-auth";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/auth-rate-limit";

const loginSchema = z.object({
  username: z.string().trim().min(1, "username is required"),
  password: z.string().trim().min(1, "password is required"),
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const limit = checkLoginRateLimit(request, body.username);
    if (limit.limited) {
      return NextResponse.json(
        { error: `登录尝试过于频繁，请 ${limit.retryAfterSeconds} 秒后重试` },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfterSeconds),
          },
        },
      );
    }

    if (!verifyAdminLogin(body.username, body.password)) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    resetLoginRateLimit(request, body.username);
    const token = createAdminToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid login payload", details: error.flatten() },
        { status: 400 },
      );
    }
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
