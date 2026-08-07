import { NextResponse } from "next/server";

import { isStaticSite } from "@/lib/site-mode";

/** Stateless JWT: client clears localStorage. */
export async function POST() {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static export has no auth API" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
