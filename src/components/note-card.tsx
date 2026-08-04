import type { NoteRecord } from "@/lib/notes-service";
import { BorderGlow } from "@/components/reactbits/border-glow";
import { StarBorder } from "@/components/reactbits/star-border";

type NoteCardProps = {
  note: NoteRecord;
  onDelete: (id: string) => Promise<void>;
  deletingId: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function NoteCard({ note, onDelete, deletingId }: NoteCardProps) {
  return (
    <BorderGlow
      className="rounded-[1.75rem]"
      glowColor="rgba(103, 232, 249, 0.26)"
      backgroundColor="rgba(2, 6, 23, 0.28)"
    >
      <article className="rounded-[1.75rem] border border-white/10 bg-slate-950/40 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-white">
              {note.title}
            </h3>
            {note.summary ? (
              <p className="mt-3 text-sm leading-7 text-slate-300">{note.summary}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>Updated {dateFormatter.format(new Date(note.updatedAt))}</span>
              <span className="text-slate-600">/</span>
              <StarBorder className="rounded-full" color="rgba(103, 232, 249, 0.76)">
                <a
                  href={`/notes/${note.slug}`}
                  className="rounded-full bg-slate-950/95 px-3 py-1 font-semibold text-cyan-200 transition hover:text-white"
                >
                  查看公开详情
                </a>
              </StarBorder>
            </div>
          </div>

          <button
              type="button"
              onClick={() => void onDelete(note.id)}
              disabled={deletingId === note.id}
              className="rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 transition hover:border-rose-400/35 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingId === note.id ? "删除中..." : "删除笔记"}
            </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <BorderGlow className="mt-6 rounded-[1.5rem]" glowColor="rgba(255, 255, 255, 0.16)">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <p className="text-sm leading-8 whitespace-pre-wrap text-slate-300">
              {note.contentMarkdown}
            </p>
          </div>
        </BorderGlow>
      </article>
    </BorderGlow>
  );
}
