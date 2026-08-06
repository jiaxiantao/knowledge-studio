import { NextResponse } from "next/server";
import { z } from "zod";

import { generateSessionTitle } from "@/lib/session-title";
import { isStaticSite } from "@/lib/site-mode";

const schema = z.object({
  question: z.string().trim().min(1).max(2000),
  answer: z.string().trim().max(8000).optional(),
});

export async function POST(request: Request) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support title generation" },
      { status: 400 },
    );
  }

  try {
    const body = schema.parse(await request.json());
    const title = await generateSessionTitle(body.question, body.answer);
    return NextResponse.json({ title });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate title",
      },
      { status: 500 },
    );
  }
}
