import type { Note } from "@prisma/client";

import { getReadyDb } from "@/lib/db";

export type NoteRecord = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  contentMarkdown: string;
  tags: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

type CreateNoteInput = {
  title: string;
  summary?: string;
  contentMarkdown: string;
  tags: string[];
  isPublished?: boolean;
};

function mapNote(note: Note): NoteRecord {
  return {
    id: note.id,
    title: note.title,
    slug: note.slug,
    summary: note.summary,
    contentMarkdown: note.contentMarkdown,
    tags: note.tags,
    isPublished: note.isPublished,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function buildUniqueSlug(title: string) {
  const db = await getReadyDb();

  if (!db) {
    return slugify(title);
  }

  const baseSlug = slugify(title);
  let nextSlug = baseSlug || `note-${Date.now()}`;
  let counter = 1;

  while (await db.note.findUnique({ where: { slug: nextSlug } })) {
    counter += 1;
    nextSlug = `${baseSlug}-${counter}`;
  }

  return nextSlug;
}

export async function listNotes() {
  const db = await getReadyDb();

  if (!db) {
    return [] as NoteRecord[];
  }

  try {
    const notes = await db.note.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    });

    return notes.map(mapNote);
  } catch {
    return [] as NoteRecord[];
  }
}

export async function listPublishedNotes() {
  const notes = await listNotes();

  return notes.filter((note) => note.isPublished);
}

export async function getPublishedNoteBySlug(slug: string) {
  const db = await getReadyDb();

  if (!db) {
    return null;
  }

  try {
    const note = await db.note.findUnique({
      where: { slug },
    });

    if (!note || !note.isPublished) {
      return null;
    }

    return mapNote(note);
  } catch {
    return null;
  }
}

export async function createNote(input: CreateNoteInput) {
  const db = await getReadyDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  const slug = await buildUniqueSlug(input.title);
  const note = await db.note.create({
    data: {
      title: input.title.trim(),
      slug,
      summary: input.summary?.trim() || null,
      contentMarkdown: input.contentMarkdown.trim(),
      tags: input.tags,
      isPublished: input.isPublished ?? true,
    },
  });

  return mapNote(note);
}

export async function deleteNote(id: string) {
  const db = await getReadyDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured or PostgreSQL is unreachable");
  }

  await db.note.delete({
    where: { id },
  });
}
