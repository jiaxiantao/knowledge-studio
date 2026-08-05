import { NextResponse } from "next/server";
import { z } from "zod";

import { generateFollowUpSuggestions } from "@/lib/follow-up-suggestions";
import { isStaticSite } from "@/lib/site-mode";

const schema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export async function POST(request: Request) {
  if (isStaticSite()) {
    return NextResponse.json(
      { error: "Static site does not support suggestions" },
      { status: 400 },
    );
  }

  try {
    const body = schema.parse(await request.json());
    const suggestions = await generateFollowUpSuggestions(
      body.question,
      body.answer,
    );

    return NextResponse.json({ suggestions });
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
          error instanceof Error
            ? error.message
            : "Failed to generate suggestions",
      },
      { status: 500 },
    );
  }
}
