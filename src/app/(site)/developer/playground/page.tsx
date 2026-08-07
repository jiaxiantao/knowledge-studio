import { Suspense } from "react";

import { ApiPlaygroundPageClient } from "@/components/developer/api-playground-page-client";

export default function ApiPlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-10 text-sm text-slate-400">加载调试页…</div>
      }
    >
      <ApiPlaygroundPageClient />
    </Suspense>
  );
}
