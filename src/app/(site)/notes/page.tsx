import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { StarBorder } from "@/components/reactbits/star-border";
import { NoteLibrary } from "@/components/note-library";
import { NoteManager } from "@/components/note-manager";
import { NoteSearchDemo } from "@/components/note-search-demo";
import { NotesIntelligenceBridge } from "@/components/notes-intelligence-bridge";
import { buildNoteAssistantPrompts } from "@/lib/note-assistant-prompts";
import { SectionHeading } from "@/components/section-heading";
import { SectionSkeleton } from "@/components/section-skeleton";
import { listPublishedNotes } from "@/lib/notes-service";

const SearchCompareDemo = dynamic(
  () =>
    import("@/components/demos/search-compare-demo").then(
      (mod) => mod.SearchCompareDemo,
    ),
  { loading: () => <SectionSkeleton lines={4} /> },
);

export const metadata: Metadata = {
  title: "Notes | XJ / Frontend Systems",
  description:
    "PostgreSQL notes library with pg_trgm search and grounded assistant integration.",
};

export default async function NotesPage() {
  const publishedNotes = await listPublishedNotes();
  const assistantPrompts = buildNoteAssistantPrompts(publishedNotes);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-10 lg:px-8 lg:py-14">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Notes</p>
        <h1 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
          PostgreSQL 笔记库
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
          pg_trgm 检索 · CRUD API · 作为 Assistant 的召回源。
        </p>
        <StarBorder className="mt-6 rounded-full" color="rgba(255, 255, 255, 0.9)">
            <Link
              href="/assistant?q=%E6%88%91%E5%9C%A8%E5%89%8D%E7%AB%AF%E6%9E%B6%E6%9E%84%E8%AF%84%E5%AE%A1%E6%97%B6%E6%9C%80%E5%85%88%E7%A1%AE%E8%AE%A4%E4%BB%80%E4%B9%88%EF%BC%9F"
              className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
            >
              用 Assistant 追问
            </Link>
          </StarBorder>
      </section>

      <NotesIntelligenceBridge prompts={assistantPrompts} />

      <section className="space-y-6">
        <SectionHeading eyebrow="pg_trgm" title="相似度检索演示" />
        <NoteSearchDemo />
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Compare"
          title="双引擎并行对比（pg_trgm vs memory）"
        />
        <SearchCompareDemo />
      </section>

      <section className="space-y-6">
        <SectionHeading eyebrow="Library" title="公开笔记" />
        <NoteLibrary notes={publishedNotes} />
      </section>

      <details
        id="workspace"
        className="group rounded-[1.75rem] border border-white/10 bg-slate-950/35"
      >
        <summary className="cursor-pointer list-none px-6 py-5 text-sm font-semibold text-slate-200 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="text-cyan-200/80">维护入口</span>
          <span className="ml-2 text-slate-500">· 需要管理员登录 Token</span>
        </summary>
        <div className="border-t border-white/10 px-6 py-6">
          <NoteManager />
        </div>
      </details>
    </main>
  );
}
