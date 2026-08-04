import { listNotes, listPublishedNotes } from "@/lib/notes-service";
import { getReadyDb } from "@/lib/db";

export type NoteAnalytics = {
  source: "postgresql" | "memory";
  queries: string[];
  stats: {
    totalNotes: number;
    publishedNotes: number;
    draftNotes: number;
    avgContentLength: number;
  };
  notesByMonth: Array<{ month: string; count: number }>;
  tagDistribution: Array<{ tag: string; count: number }>;
};

const analyticsQueries = {
  monthly:
    'date_trunc(\'month\', "updatedAt") + GROUP BY month on published notes',
  tags: 'unnest(tags) + GROUP BY tag on "Note"',
  stats: 'COUNT / FILTER / AVG(length("contentMarkdown")) on "Note"',
};

function buildMemoryAnalytics(
  notes: Awaited<ReturnType<typeof listPublishedNotes>>,
): NoteAnalytics {
  const tagMap = new Map<string, number>();
  const monthMap = new Map<string, number>();

  for (const note of notes) {
    const month = note.updatedAt.slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1);

    for (const tag of note.tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  const totalLength = notes.reduce(
    (sum, note) => sum + note.contentMarkdown.length,
    0,
  );

  return {
    source: "memory",
    queries: ["in-memory aggregation (DATABASE_URL unavailable)"],
    stats: {
      totalNotes: notes.length,
      publishedNotes: notes.filter((n) => n.isPublished).length,
      draftNotes: notes.filter((n) => !n.isPublished).length,
      avgContentLength: notes.length
        ? Math.round(totalLength / notes.length)
        : 0,
    },
    notesByMonth: [...monthMap.entries()]
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12),
    tagDistribution: [...tagMap.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
  };
}

export async function getNoteAnalytics(): Promise<NoteAnalytics> {
  const db = await getReadyDb();
  const allNotes = await listNotes();

  if (!db) {
    return buildMemoryAnalytics(allNotes);
  }

  try {
    const [monthlyRows, tagRows, statRows] = await Promise.all([
      db.$queryRaw<Array<{ month: string; count: bigint }>>`
          SELECT to_char(date_trunc('month', "updatedAt"), 'YYYY-MM') AS month,
                 COUNT(*)::bigint AS count
          FROM "Note"
          WHERE "isPublished" = true
          GROUP BY 1
          ORDER BY 1 ASC
          LIMIT 12
        `,
      db.$queryRaw<Array<{ tag: string; count: bigint }>>`
          SELECT tag, COUNT(*)::bigint AS count
          FROM "Note", unnest(tags) AS tag
          GROUP BY tag
          ORDER BY count DESC
          LIMIT 12
        `,
      db.$queryRaw<
        Array<{
          total: bigint;
          published: bigint;
          draft: bigint;
          avg_content_length: bigint;
        }>
      >`
          SELECT COUNT(*)::bigint AS total,
                 COUNT(*) FILTER (WHERE "isPublished" = true)::bigint AS published,
                 COUNT(*) FILTER (WHERE "isPublished" = false)::bigint AS draft,
                 COALESCE(AVG(length("contentMarkdown")), 0)::bigint AS avg_content_length
          FROM "Note"
        `,
    ]);

    const statsRow = statRows[0];

    return {
      source: "postgresql",
      queries: [
        analyticsQueries.monthly,
        analyticsQueries.tags,
        analyticsQueries.stats,
      ],
      stats: {
        totalNotes: Number(statsRow?.total ?? 0),
        publishedNotes: Number(statsRow?.published ?? 0),
        draftNotes: Number(statsRow?.draft ?? 0),
        avgContentLength: Number(statsRow?.avg_content_length ?? 0),
      },
      notesByMonth: monthlyRows.map((row) => ({
        month: row.month,
        count: Number(row.count),
      })),
      tagDistribution: tagRows.map((row) => ({
        tag: row.tag,
        count: Number(row.count),
      })),
    };
  } catch {
    const fallback = buildMemoryAnalytics(allNotes);
    fallback.queries = [
      ...fallback.queries,
      "PostgreSQL query failed — fell back to in-memory aggregation",
    ];
    return fallback;
  }
}
