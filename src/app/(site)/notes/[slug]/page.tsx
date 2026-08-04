/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { SectionHeading } from "@/components/section-heading";
import {
  getPublishedNoteBySlug,
  listPublishedNotes,
} from "@/lib/notes-service";

type NoteDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function generateStaticParams() {
  return [];
}

function scoreRelatedNote(
  tags: string[],
  currentSlug: string,
  note: Awaited<ReturnType<typeof listPublishedNotes>>[number],
) {
  if (note.slug === currentSlug) {
    return -1;
  }

  const sharedTagCount = note.tags.filter((tag) => tags.includes(tag)).length;

  return sharedTagCount * 10 + new Date(note.updatedAt).getTime() / 1_000_000_000_000;
}

export async function generateMetadata({
  params,
}: NoteDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const note = await getPublishedNoteBySlug(slug);

  if (!note) {
    return {
      title: "Note Not Found | XJ / Frontend Systems",
    };
  }

  return {
    title: `${note.title} | Notes | XJ / Frontend Systems`,
    description:
      note.summary ??
      "A public note from my frontend systems workbench and knowledge base.",
  };
}

export default async function NoteDetailPage({ params }: NoteDetailPageProps) {
  const { slug } = await params;
  const note = await getPublishedNoteBySlug(slug);

  if (!note) {
    notFound();
  }

  const relatedNotes = (await listPublishedNotes())
    .map((item) => ({
      ...item,
      relatedScore: scoreRelatedNote(note.tags, note.slug, item),
    }))
    .filter((item) => item.relatedScore >= 0)
    .sort((left, right) => right.relatedScore - left.relatedScore)
    .slice(0, 3);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-10 lg:px-8 lg:py-16">
        <section className="rounded-[2.25rem] border border-white/10 bg-white/5 p-8 lg:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Note Detail
          </p>
          <a
            href="/notes"
            className="mt-4 inline-flex text-sm font-semibold text-cyan-200 transition hover:text-white"
          >
            返回 Notes
          </a>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
            {note.title}
          </h1>
          {note.summary ? (
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              {note.summary}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span>Updated {dateFormatter.format(new Date(note.updatedAt))}</span>
            <span className="text-slate-600">/</span>
            <span>{note.tags.length} 个主题标签</span>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-7">
            <div className="space-y-6 text-sm leading-8 text-slate-200">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h2 className="text-3xl font-semibold tracking-tight text-white">
                      {children}
                    </h2>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-3xl font-semibold tracking-tight text-white">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-2xl font-semibold tracking-tight text-white">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-base leading-8 text-slate-200">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="grid gap-3 pl-5 text-base text-slate-200">
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => (
                    <li className="list-disc leading-8">{children}</li>
                  ),
                  code: ({ children }) => (
                    <code className="rounded bg-white/10 px-2 py-1 text-sm text-cyan-100">
                      {children}
                    </code>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4 transition hover:text-white"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {note.contentMarkdown}
              </ReactMarkdown>
            </div>
          </article>

          <aside className="grid gap-6">
            <article className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
                Continue In Assistant
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                这条笔记也可以继续被追问
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                我会把公开笔记作为对话的上游内容，所以从单条笔记继续追问，比较接近我平时真实整理和追溯内容的方式。
              </p>
              <a
                href={`/assistant?q=${encodeURIComponent(`请基于这条笔记继续展开：${note.title}`)}`}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
              >
                基于这条笔记继续提问
              </a>
            </article>

            <article className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-6">
              <SectionHeading
                eyebrow="Related Notes"
                title="可以继续顺着相近主题往下读"
                description="我会优先按相同标签和最近更新时间组织相关内容，这样更像工作台里的连续记录。"
              />
              <div className="mt-6 grid gap-4">
                {relatedNotes.length ? (
                  relatedNotes.map((relatedNote) => (
                    <a
                      key={relatedNote.id}
                      href={`/notes/${relatedNote.slug}`}
                      className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/10"
                    >
                      <h3 className="text-lg font-semibold text-white">
                        {relatedNote.title}
                      </h3>
                      {relatedNote.summary ? (
                        <p className="mt-3 text-sm leading-7 text-slate-300">
                          {relatedNote.summary}
                        </p>
                      ) : null}
                    </a>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 p-5 text-sm text-slate-400">
                    这条笔记目前还是单点内容，后面我会继续把更多相关主题接进来。
                  </div>
                )}
              </div>
            </article>
          </aside>
        </section>
      </main>

  );
}
