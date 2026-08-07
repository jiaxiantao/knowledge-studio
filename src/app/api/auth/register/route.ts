import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateOrRegister } from "@/lib/auth/sign-in";
import { isStaticSite } from "@/lib/site-mode";

const registerSchema = z.object({
  account: z.string().trim().min(1, "请输入邮箱或手机号").max(200),
  password: z.string().min(1, "请输入密码").max(128),
  /** Optional; ignored when using 登录即注册 (name auto-derived). */
  name: z.string().trim().max(64).optional(),
});

/** Alias of login（登录即注册）；保留路径兼容旧客户端。 */
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }

  const result = await authenticateOrRegister({
    account: parsed.data.account,
    password: parsed.data.password,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(
    {
      token: result.token,
      user: result.user,
      created: result.created,
    },
    { status: result.created ? 201 : 200 },
  );
}
