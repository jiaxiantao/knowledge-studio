import { NextResponse } from "next/server";

import { toPublicUser } from "@/lib/auth/claim";
import { requireUser } from "@/lib/auth/require-user";
import { getReadyDb } from "@/lib/db";
import { isStaticSite } from "@/lib/site-mode";

export async function GET(request: Request) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static export has no auth API" },
      { status: 400 },
    );
  }

  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  const db = await getReadyDb();
  if (!db) {
    return NextResponse.json(
      { error: "数据库不可用" },
      { status: 503 },
    );
  }

  const user = await db.user.findUnique({ where: { id: auth.user.id } });
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  return NextResponse.json({ user: toPublicUser(user) });
}
