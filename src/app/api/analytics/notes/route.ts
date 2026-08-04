import { NextResponse } from "next/server";

import { getNoteAnalytics } from "@/lib/note-analytics";

export async function GET() {
  const analytics = await getNoteAnalytics();
  return NextResponse.json(analytics);
}
