import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AdminAuthError,
  assertAdminTokenFromRequest,
} from "@/lib/admin-auth";
import { createNote, listNotes } from "@/lib/notes-service";

const createNoteSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  summary: z.string().trim().optional(),
  contentMarkdown: z.string().trim().min(1, "Content is required"),
  tags: z
    .array(z.string().trim())
    .default([])
    .transform((tags) => tags.filter(Boolean)),
  isPublished: z.boolean().optional(),
});

export async function GET() {
  const notes = await listNotes();

  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  try {
    const body = createNoteSchema.parse(await request.json());
    assertAdminTokenFromRequest(request);

    const note = await createNote({
      title: body.title,
      summary: body.summary,
      contentMarkdown: body.contentMarkdown,
      tags: body.tags,
      isPublished: body.isPublished,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid note payload", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 },
    );
  }
}
