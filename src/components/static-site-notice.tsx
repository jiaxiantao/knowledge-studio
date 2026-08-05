import Link from "next/link";

import { isStaticSite } from "@/lib/site-mode";

export function StaticSiteNotice({
  feature = "该能力",
}: {
  feature?: string;
}) {
  if (!isStaticSite()) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-7 text-amber-50/90">
      当前为 GitHub Pages 静态预览，{feature}需要本地全栈（PostgreSQL + API +
      Ollama）。请克隆仓库后执行{" "}
      <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs">
        pnpm dev
      </code>
      ，或查看{" "}
      <Link href="/knowledge" className="underline underline-offset-2">
        知识库
      </Link>
      。
    </div>
  );
}
