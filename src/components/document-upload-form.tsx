"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { StaticSiteNotice } from "@/components/static-site-notice";
import { DarkSelect } from "@/components/ui/dark-select";
import { isStaticSite } from "@/lib/site-mode";

const ACCEPTED_EXTENSIONS = [".md", ".markdown", ".txt", ".pdf"] as const;
const MAX_FILES = 20;
const DEFAULT_CATEGORY = "默认类目";

type PendingFile = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function isAcceptedFile(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function DocumentUploadForm({
  knowledgeBaseId,
}: {
  knowledgeBaseId: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const staticSite = isStaticSite();

  const [categories, setCategories] = useState<string[]>([DEFAULT_CATEGORY]);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [newCategory, setNewCategory] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(!staticSite);

  const [addingCategory, setAddingCategory] = useState(false);

  const loadCategories = useCallback(async () => {
    if (staticSite) {
      return;
    }

    setLoadingCategories(true);
    try {
      const response = await fetch(
        `/api/categories?knowledgeBaseId=${encodeURIComponent(knowledgeBaseId)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        categories?: Array<{ name: string }>;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "加载类目失败");
      }
      const names = (payload.categories ?? [])
        .map((item) => item.name.trim())
        .filter(Boolean);
      setCategories(
        names.length ? names : [DEFAULT_CATEGORY],
      );
      setCategory((current) =>
        names.includes(current) ? current : names[0] ?? DEFAULT_CATEGORY,
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "加载类目失败",
      );
    } finally {
      setLoadingCategories(false);
    }
  }, [knowledgeBaseId, staticSite]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCategories();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCategories]);

  const acceptedHint = useMemo(
    () => ACCEPTED_EXTENSIONS.join(" / "),
    [],
  );

  function addFiles(fileList: FileList | File[] | null) {
    if (!fileList) {
      return;
    }

    const incoming = Array.from(fileList);
    setError(null);

    setFiles((current) => {
      const next = [...current];
      for (const file of incoming) {
        if (next.length >= MAX_FILES) {
          setError(`一次最多上传 ${MAX_FILES} 个文件`);
          break;
        }
        if (!isAcceptedFile(file)) {
          setError(`不支持的文件类型：${file.name}（仅 ${acceptedHint}）`);
          continue;
        }
        const duplicate = next.some(
          (item) =>
            item.file.name === file.name && item.file.size === file.size,
        );
        if (duplicate) {
          continue;
        }
        next.push({
          id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
          file,
          status: "pending",
        });
      }
      return next;
    });

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((item) => item.id !== id));
  }

  async function handleAddCategory() {
    const name = newCategory.trim();
    if (!name || addingCategory) {
      return;
    }

    setAddingCategory(true);
    setError(null);

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, knowledgeBaseId }),
      });
      const payload = (await response.json()) as {
        category?: { name: string };
        error?: string;
      };

      if (!response.ok || !payload.category) {
        throw new Error(payload.error ?? "新增类目失败");
      }

      setCategories((current) =>
        current.includes(payload.category!.name)
          ? current
          : [...current, payload.category!.name].sort((a, b) =>
              a.localeCompare(b, "zh-CN"),
            ),
      );
      setCategory(payload.category.name);
      setNewCategory("");
      setShowAddCategory(false);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "新增类目失败");
    } finally {
      setAddingCategory(false);
    }
  }

  async function handleSubmit() {
    if (staticSite || !files.length || uploading) {
      return;
    }

    setUploading(true);
    setError(null);

    let successCount = 0;
    let failCount = 0;

    for (const item of files) {
      setFiles((current) =>
        current.map((file) =>
          file.id === item.id
            ? { ...file, status: "uploading", error: undefined }
            : file,
        ),
      );

      try {
        const form = new FormData();
        form.append("file", item.file);
        form.append("category", category.trim() || DEFAULT_CATEGORY);
        form.append("knowledgeBaseId", knowledgeBaseId);

        const response = await fetch("/api/documents", {
          method: "POST",
          body: form,
        });
        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? `上传失败：${item.file.name}`);
        }

        successCount += 1;
        setFiles((current) =>
          current.map((file) =>
            file.id === item.id ? { ...file, status: "done" } : file,
          ),
        );
      } catch (uploadError) {
        failCount += 1;
        const message =
          uploadError instanceof Error ? uploadError.message : "上传失败";
        setFiles((current) =>
          current.map((file) =>
            file.id === item.id
              ? { ...file, status: "error", error: message }
              : file,
          ),
        );
      }
    }

    setUploading(false);

    if (failCount === 0 && successCount > 0) {
      router.push(`/knowledge/documents?kb=${encodeURIComponent(knowledgeBaseId)}`);
      return;
    }

    if (failCount > 0) {
      setError(`完成 ${successCount} 个，失败 ${failCount} 个。可移除失败项后重试。`);
    }
  }

  if (staticSite) {
    return <StaticSiteNotice feature="文档上传与索引" />;
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-950">
            1
          </span>
          <span className="text-white">选择数据</span>
        </div>
        <span className="h-px w-8 bg-white/15" />
        <div className="flex items-center gap-2 text-slate-500">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 text-xs">
            2
          </span>
          <span>上传并解析</span>
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">
              <span className="mr-1 text-rose-300">*</span>
              配置类目
            </p>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              为本次上传的文档指定类目，便于后续筛选与管理。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddCategory((open) => !open)}
            className="inline-flex items-center gap-1 text-sm text-cyan-200 hover:text-cyan-100"
          >
            <Plus className="h-3.5 w-3.5" />
            新增类目
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <DarkSelect
            value={category}
            onChange={setCategory}
            options={categories.map((item) => ({
              value: item,
              label: item,
            }))}
            placeholder="选择类目"
          />
          <button
            type="button"
            onClick={() => void loadCategories()}
            disabled={loadingCategories}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-300 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loadingCategories ? "animate-spin" : ""}`}
            />
            刷新
          </button>
        </div>

        {showAddCategory ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="输入新类目名称"
              className="min-w-[16rem] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
            />
            <button
              type="button"
              disabled={addingCategory || !newCategory.trim()}
              onClick={() => void handleAddCategory()}
              className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            >
              {addingCategory ? "保存中…" : "添加"}
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
        <p className="text-sm font-medium text-white">
          <span className="mr-1 text-rose-300">*</span>
          文件上传
        </p>
        <p className="mt-1 text-xs leading-6 text-slate-500">
          支持一次最多 {MAX_FILES} 个文件。上传后将自动切片并写入向量索引。
        </p>

        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          multiple
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragOver(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            addFiles(event.dataTransfer.files);
          }}
          className={`mt-4 flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center transition ${
            dragOver
              ? "border-cyan-300/50 bg-cyan-300/10"
              : "border-white/15 bg-white/[0.02] hover:border-white/25"
          }`}
        >
          <Upload className="h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm text-slate-200">点击或拖拽上传文件</p>
          <p className="mt-1 text-xs text-slate-500">
            支持 {acceptedHint}，单个文件建议不超过 20MB
          </p>
        </button>

        {files.length ? (
          <ul className="mt-4 grid gap-2">
            {files.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-cyan-200/80" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-100">
                      {item.file.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatBytes(item.file.size)}
                      {item.status === "uploading"
                        ? " · 上传解析中…"
                        : item.status === "done"
                          ? " · 已提交"
                          : item.status === "error"
                            ? ` · ${item.error ?? "失败"}`
                            : " · 待上传"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={uploading && item.status === "uploading"}
                  onClick={() => removeFile(item.id)}
                  className="inline-flex items-center gap-1 text-xs text-rose-200/90 hover:text-rose-100 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  移除
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
        <p className="text-sm font-medium text-white">解析说明</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-6 text-slate-400">
          <li>上传后文档会立即出现在知识库列表，状态显示解析进度。</li>
          <li>文本会按规则切片，并通过本地 embedding 模型写入 pgvector。</li>
          <li>解析完成后可在列表中查看切片，或直接用于知识检索 / 问答。</li>
        </ul>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!files.length || uploading}
          onClick={() => void handleSubmit()}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {uploading ? "上传解析中…" : "开始上传"}
        </button>
        <Link
          href={`/knowledge/documents?kb=${encodeURIComponent(knowledgeBaseId)}`}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white"
        >
          取消
        </Link>
      </div>
    </div>
  );
}
