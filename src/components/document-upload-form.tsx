"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { StaticSiteNotice } from "@/components/static-site-notice";
import { ChunkIndexSettings } from "@/components/chunk-index-settings";
import { DarkSelect } from "@/components/ui/dark-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEFAULT_CHUNK_CONFIG,
  serializeChunkConfig,
  type ChunkConfig,
} from "@/lib/chunk-config";
import { isStaticSite } from "@/lib/site-mode";
import {
  MAX_UPLOAD_FILES,
  acceptAttribute,
  validateUploadBasics,
} from "@/lib/upload-rules";
import { apiFetch } from "@/lib/api-fetch";

const DEFAULT_CATEGORY = "默认类目";

type CategoryOption = {
  id: string;
  name: string;
};

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

function fileStatusLabel(item: PendingFile) {
  if (item.status === "uploading") {
    return "上传解析中…";
  }
  if (item.status === "done") {
    return "已提交";
  }
  if (item.status === "error") {
    return item.error ?? "上传失败";
  }
  return "待上传";
}

function FormatRequirementsHint({ fileCount }: { fileCount: number }) {
  return (
    <span
      className="group relative inline-flex"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="text-[#3b82f6] hover:text-[#60a5fa]"
        aria-describedby="upload-format-requirements"
      >
        查看格式要求
      </button>
      <span
        id="upload-format-requirements"
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-[26rem] -translate-x-1/2 rounded-lg bg-slate-900 px-3.5 py-3 text-left text-[12px] leading-5 text-white opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        <span className="block">
          单文档：大小≤150MB或1000页，格式支持.doc,.docx,.ppt,.pptx,.pdf
        </span>
        <span className="mt-1.5 block">
          表格：建议10MB以内，10万行以内，格式支持xls、xlsx
        </span>
        <span className="mt-1.5 block">
          单图片：大小≤20MB，最短边 &gt; 15px，长边 &lt; 8192px，长宽比 &lt;
          50，格式支持.png,.jpg,.jpeg,.bmp,.gif等
        </span>
        <span className="mt-1.5 block">
          纯文本：建议不要超过10MB，格式支持.md,.txt,.html
        </span>
        <span className="mt-1.5 block">
          最多支持 ({fileCount} / {MAX_UPLOAD_FILES}) 个
        </span>
      </span>
    </span>
  );
}

export function DocumentUploadForm({
  knowledgeBaseId,
}: {
  knowledgeBaseId: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const staticSite = isStaticSite();

  const [uploadStep, setUploadStep] = useState<1 | 2>(1);
  const [chunkConfig, setChunkConfig] = useState<ChunkConfig>({
    ...DEFAULT_CHUNK_CONFIG,
  });
  const [categories, setCategories] = useState<CategoryOption[]>([
    { id: "default", name: DEFAULT_CATEGORY },
  ]);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [newCategory, setNewCategory] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editCategoryName, setEditCategoryName] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(!staticSite);

  const [addingCategory, setAddingCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [pendingDeleteCategory, setPendingDeleteCategory] =
    useState<CategoryOption | null>(null);

  const loadCategories = useCallback(async () => {
    if (staticSite) {
      return;
    }

    setLoadingCategories(true);
    try {
      const response = await apiFetch(
        `/api/categories?knowledgeBaseId=${encodeURIComponent(knowledgeBaseId)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        categories?: Array<{ id: string; name: string }>;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "加载类目失败");
      }
      const next = (payload.categories ?? [])
        .map((item) => ({
          id: item.id,
          name: item.name.trim(),
        }))
        .filter((item) => item.id && item.name);
      setCategories(
        next.length ? next : [{ id: "default", name: DEFAULT_CATEGORY }],
      );
      setCategory((current) =>
        next.some((item) => item.name === current)
          ? current
          : next[0]?.name ?? DEFAULT_CATEGORY,
      );
      setEditingCategoryId(null);
      setEditCategoryName("");
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

  function addFiles(fileList: FileList | File[] | null) {
    if (!fileList) {
      return;
    }

    const incoming = Array.from(fileList);
    setError(null);

    setFiles((current) => {
      const next = [...current];
      for (const file of incoming) {
        if (next.length >= MAX_UPLOAD_FILES) {
          setError(`一次最多上传 ${MAX_UPLOAD_FILES} 个文件`);
          break;
        }
        const basics = validateUploadBasics(file.name, file.size);
        const duplicate = next.some(
          (item) =>
            item.file.name === file.name && item.file.size === file.size,
        );
        if (duplicate) {
          continue;
        }
        if (!basics.ok) {
          next.push({
            id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
            file,
            status: "error",
            error: basics.error,
          });
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
      const response = await apiFetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, knowledgeBaseId }),
      });
      const payload = (await response.json()) as {
        category?: { id: string; name: string };
        error?: string;
      };

      if (!response.ok || !payload.category) {
        throw new Error(payload.error ?? "新增类目失败");
      }

      const created = {
        id: payload.category.id,
        name: payload.category.name,
      };
      setCategories((current) => {
        if (current.some((item) => item.id === created.id)) {
          return current;
        }
        return [...current, created].sort((a, b) =>
          a.name.localeCompare(b.name, "zh-CN"),
        );
      });
      setCategory(created.name);
      setNewCategory("");
      setShowAddCategory(false);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "新增类目失败");
    } finally {
      setAddingCategory(false);
    }
  }

  function startEditCategory(item: CategoryOption) {
    if (item.name === DEFAULT_CATEGORY) {
      setError("默认类目不可修改");
      return;
    }
    setShowAddCategory(false);
    setEditingCategoryId(item.id);
    setEditCategoryName(item.name);
    setError(null);
  }

  async function handleRenameCategory() {
    if (!editingCategoryId || savingCategory) {
      return;
    }
    const name = editCategoryName.trim();
    if (!name) {
      setError("类目名称不能为空");
      return;
    }

    setSavingCategory(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/categories/${editingCategoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json()) as {
        category?: { id: string; name: string };
        error?: string;
      };
      if (!response.ok || !payload.category) {
        throw new Error(payload.error ?? "修改类目失败");
      }

      const renamed = {
        id: payload.category.id,
        name: payload.category.name,
      };
      setCategories((current) =>
        current
          .map((item) => (item.id === renamed.id ? renamed : item))
          .sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
      );
      setCategory((current) => {
        const previous = categories.find((item) => item.id === renamed.id);
        return previous && previous.name === current ? renamed.name : current;
      });
      setEditingCategoryId(null);
      setEditCategoryName("");
    } catch (renameError) {
      setError(
        renameError instanceof Error ? renameError.message : "修改类目失败",
      );
    } finally {
      setSavingCategory(false);
    }
  }

  function requestDeleteCategory(item: CategoryOption) {
    if (item.name === DEFAULT_CATEGORY) {
      setError("默认类目不可删除");
      return;
    }
    if (savingCategory) {
      return;
    }
    setError(null);
    setPendingDeleteCategory(item);
  }

  async function confirmDeleteCategory() {
    const item = pendingDeleteCategory;
    if (!item || savingCategory) {
      return;
    }

    setSavingCategory(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/categories/${item.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "删除类目失败");
      }

      setCategories((current) =>
        current.filter((entry) => entry.id !== item.id),
      );
      setCategory((current) =>
        current === item.name ? DEFAULT_CATEGORY : current,
      );
      if (editingCategoryId === item.id) {
        setEditingCategoryId(null);
        setEditCategoryName("");
      }
      setPendingDeleteCategory(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "删除类目失败",
      );
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleSubmit() {
    if (staticSite || !files.length || uploading) {
      return;
    }

    setUploading(true);
    setError(null);

    let successCount = 0;
    const failedItems: Array<{ name: string; reason: string }> = [];

    for (const item of files) {
      if (item.status === "done") {
        successCount += 1;
        continue;
      }
      if (item.status === "error") {
        failedItems.push({
          name: item.file.name,
          reason: item.error ?? "上传失败",
        });
        continue;
      }

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
        form.append("chunkConfig", serializeChunkConfig(chunkConfig));

        const response = await apiFetch("/api/documents", {
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
        const message =
          uploadError instanceof Error ? uploadError.message : "上传失败";
        failedItems.push({ name: item.file.name, reason: message });
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

    if (failedItems.length === 0 && successCount > 0) {
      router.push(`/knowledge/documents?kb=${encodeURIComponent(knowledgeBaseId)}`);
      return;
    }

    if (failedItems.length > 0) {
      const failedSummary = failedItems
        .map((item) => `「${item.name}」${item.reason}`)
        .join("；");
      setError(
        `完成 ${successCount} 个，失败 ${failedItems.length} 个：${failedSummary}。可移除失败项后重试。`,
      );
    }
  }

  if (staticSite) {
    return <StaticSiteNotice feature="文档上传与索引" />;
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3 text-sm">
        <div
          className={`flex items-center gap-2 ${uploadStep === 1 ? "text-white" : "text-slate-400"}`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              uploadStep === 1
                ? "bg-white text-slate-950"
                : "border border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
            }`}
          >
            {uploadStep > 1 ? "✓" : "1"}
          </span>
          <span>选择数据</span>
        </div>
        <span className="h-px w-8 bg-white/15" />
        <div
          className={`flex items-center gap-2 ${uploadStep === 2 ? "text-white" : "text-slate-500"}`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
              uploadStep === 2
                ? "bg-white font-semibold text-slate-950"
                : "border border-white/15"
            }`}
          >
            2
          </span>
          <span>索引设置</span>
        </div>
      </div>

      {uploadStep === 1 ? (
        <>
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
            onClick={() => {
              setEditingCategoryId(null);
              setEditCategoryName("");
              setShowAddCategory((open) => !open);
            }}
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
              value: item.name,
              label: item.name,
            }))}
            placeholder="选择类目"
            className="min-w-[16rem] w-72 max-w-full"
            renderOptionActions={(option, { close }) => {
              const item = categories.find(
                (entry) => entry.name === option.value,
              );
              if (!item || item.name === DEFAULT_CATEGORY) {
                return null;
              }
              return (
                <>
                  <button
                    type="button"
                    title="修改类目"
                    disabled={savingCategory}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      close();
                      startEditCategory(item);
                    }}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-cyan-200 disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="删除类目"
                    disabled={savingCategory}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      close();
                      requestDeleteCategory(item);
                    }}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-rose-400/10 hover:text-rose-200 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              );
            }}
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

        {editingCategoryId ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={editCategoryName}
              onChange={(event) => setEditCategoryName(event.target.value)}
              placeholder="输入新的类目名称"
              className="min-w-[16rem] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
            />
            <button
              type="button"
              disabled={savingCategory || !editCategoryName.trim()}
              onClick={() => void handleRenameCategory()}
              className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            >
              {savingCategory ? "保存中…" : "保存修改"}
            </button>
            <button
              type="button"
              disabled={savingCategory}
              onClick={() => {
                setEditingCategoryId(null);
                setEditCategoryName("");
              }}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-50"
            >
              取消
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
        <p className="text-sm font-medium text-white">
          <span className="mr-1 text-rose-300">*</span>
          文件上传
        </p>

        <input
          ref={fileRef}
          type="file"
          accept={acceptAttribute()}
          multiple
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileRef.current?.click();
            }
          }}
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
          className={`mt-4 flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center transition ${
            dragOver
              ? "border-cyan-300/50 bg-cyan-300/10"
              : "border-white/15 bg-white/[0.02] hover:border-white/25"
          }`}
        >
          <Upload className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
          <p className="mt-3 text-base font-medium text-slate-100">
            点击或拖拽上传文件
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {"支持文档、图片等多种文件格式。"}
            <FormatRequirementsHint fileCount={files.length} />
          </p>
        </div>

        {files.length ? (
          <ul className="mt-4 grid gap-2">
            {files.map((item) => {
              const isError = item.status === "error";
              const isDone = item.status === "done";
              return (
                <li
                  key={item.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                    isError
                      ? "border-rose-400/30 bg-rose-400/10"
                      : isDone
                        ? "border-emerald-400/20 bg-emerald-400/5"
                        : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText
                      className={`h-4 w-4 shrink-0 ${
                        isError ? "text-rose-300" : "text-cyan-200/80"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-100">
                        {item.file.name}
                      </p>
                      <p
                        className={`text-[11px] ${
                          isError
                            ? "text-rose-200"
                            : isDone
                              ? "text-emerald-300/80"
                              : "text-slate-500"
                        }`}
                      >
                        {formatBytes(item.file.size)}
                        {" · "}
                        {isError ? (
                          <span className="font-medium">失败：{fileStatusLabel(item)}</span>
                        ) : (
                          fileStatusLabel(item)
                        )}
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
              );
            })}
          </ul>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
        <p className="text-sm font-medium text-white">解析说明</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-6 text-slate-400">
          <li>下一步可配置切片方式与最大分段长度（对齐百炼索引设置）。</li>
          <li>PDF 会逐页提取文字；低质量页自动 OCR 补全。</li>
          <li>解析完成后可在列表中查看切片，或直接用于知识检索 / 问答。</li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={
            !files.some(
              (item) => item.status === "pending" || item.status === "done",
            )
          }
          onClick={() => {
            setError(null);
            setUploadStep(2);
          }}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          下一步：索引设置
        </button>
        <Link
          href={`/knowledge/documents?kb=${encodeURIComponent(knowledgeBaseId)}`}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white"
        >
          取消
        </Link>
      </div>
        </>
      ) : (
        <>
          <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
            <ChunkIndexSettings value={chunkConfig} onChange={setChunkConfig} />
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
            <p className="text-sm font-medium text-white">待上传文件</p>
            <p className="mt-1 text-xs text-slate-500">
              {files.filter((item) => item.status !== "error").length} 个文件将按上方配置切片入库
            </p>
          </section>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => setUploadStep(1)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-50"
            >
              上一步
            </button>
            <button
              type="button"
              disabled={!files.length || uploading}
              onClick={() => void handleSubmit()}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {uploading ? "上传解析中…" : "完成上传"}
            </button>
            <Link
              href={`/knowledge/documents?kb=${encodeURIComponent(knowledgeBaseId)}`}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white"
            >
              取消
            </Link>
          </div>
        </>
      )}

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-7 text-rose-100">
          {error}
        </div>
      ) : null}

      <Dialog
        open={Boolean(pendingDeleteCategory)}
        onOpenChange={(open) => {
          if (!open && !savingCategory) {
            setPendingDeleteCategory(null);
          }
        }}
      >
        <DialogContent
          onClose={() => {
            if (!savingCategory) {
              setPendingDeleteCategory(null);
            }
          }}
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle>删除类目</DialogTitle>
            <DialogDescription>
              确定删除类目「{pendingDeleteCategory?.name}」？该类目下的文档将归入「
              {DEFAULT_CATEGORY}」。
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              disabled={savingCategory}
              onClick={() => setPendingDeleteCategory(null)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              disabled={savingCategory}
              onClick={() => void confirmDeleteCategory()}
              className="rounded-xl bg-rose-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-rose-300 disabled:opacity-50"
            >
              {savingCategory ? "删除中…" : "确认删除"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
