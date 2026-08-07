import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateOrRegister } from "@/lib/auth/sign-in";
import { isStaticSite } from "@/lib/site-mode";

const loginSchema = z.object({
  account: z.string().trim().min(1, "请输入邮箱或手机号").max(200),
  password: z.string().min(1, "请输入密码").max(128),
});

/** 登录即注册：账号已存在则校验密码登录，否则创建账号。 */
export async function POST(request: Request) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static export has no auth API" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效的请求体" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }

  const result = await authenticateOrRegister(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    token: result.token,
    user: result.user,
    created: result.created,
  });
}
