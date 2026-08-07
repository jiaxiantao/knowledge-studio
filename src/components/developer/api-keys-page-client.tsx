"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Code2, Copy, Plus } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { ConsoleSubpageLayout } from "@/components/console-page-top-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { showToast, ToastHost } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-fetch";
import type { ApiKeyRecord } from "@/lib/api-keys";
import { isStaticSite } from "@/lib/site-mode";
import { StaticSiteNotice } from "@/components/static-site-notice";

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `请求失败 (${response.status})`;
  } catch {
    return `请求失败 (${response.status})`;
  }
}

export function ApiKeysPageClient() {
  const { user, loading: authLoading, openAuthDialog } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [secretOpen, setSecretOpen] = useState(false);
  const [plainSecret, setPlainSecret] = useState("");
  const [editTarget, setEditTarget] = useState<ApiKeyRecord | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [resetTarget, setResetTarget] = useState<ApiKeyRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    if (!user) {
      setKeys([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch("/api/api-keys", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      const payload = (await response.json()) as { apiKeys?: ApiKeyRecord[] };
      setKeys(Array.isArray(payload.apiKeys) ? payload.apiKeys : []);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "加载 API Key 失败",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return keys;
    }
    return keys.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keyPrefix.toLowerCase().includes(q),
    );
  }, [keys, query]);

  async function handleCreate() {
    setCreating(true);
    try {
      const response = await apiFetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      const payload = (await response.json()) as {
        apiKey: ApiKeyRecord;
        secret: string;
      };
      setCreateOpen(false);
      setDescription("");
      setPlainSecret(payload.secret);
      setSecretOpen(true);
      await loadKeys();
      showToast("API Key 已创建", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "创建失败",
        "error",
      );
    } finally {
      setCreating(false);
    }
  }

  async function toggleEnabled(item: ApiKeyRecord) {
    setBusyId(item.id);
    try {
      const response = await apiFetch(`/api/api-keys/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !item.enabled }),
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      await loadKeys();
      showToast(item.enabled ? "已禁用" : "已启用", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "操作失败",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReset() {
    if (!resetTarget) {
      return;
    }
    const item = resetTarget;
    setBusyId(item.id);
    try {
      const response = await apiFetch(`/api/api-keys/${item.id}/reset`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      const payload = (await response.json()) as { secret: string };
      setResetTarget(null);
      setPlainSecret(payload.secret);
      setSecretOpen(true);
      await loadKeys();
      showToast("密钥已重置", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "重置失败",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }
    const item = deleteTarget;
    setBusyId(item.id);
    try {
      const response = await apiFetch(`/api/api-keys/${item.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      setDeleteTarget(null);
      await loadKeys();
      showToast("已删除", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "删除失败",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function saveEdit() {
    if (!editTarget) {
      return;
    }
    setBusyId(editTarget.id);
    try {
      const response = await apiFetch(`/api/api-keys/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editDescription }),
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      setEditTarget(null);
      await loadKeys();
      showToast("已保存", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "保存失败",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (isStaticSite()) {
    return (
      <ConsoleSubpageLayout backHref="/knowledge" backLabel="返回">
        <div className="px-6 pb-10">
          <StaticSiteNotice />
        </div>
      </ConsoleSubpageLayout>
    );
  }

  return (
    <>
      <ToastHost />
      <ConsoleSubpageLayout backHref="/knowledge" backLabel="知识管理">
        <div className="mx-auto w-full max-w-5xl px-6 pb-12">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">API Key</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                API Key 是调用 Knowledge Studio 对外问答接口的凭证，请妥善保管；泄露后请立即重置。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/developer/playground"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5"
              >
                <Code2 className="h-4 w-4" />
                API 调试
              </Link>
              <Button
                type="button"
                onClick={() => {
                  if (!user) {
                    openAuthDialog();
                    return;
                  }
                  setCreateOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                创建
              </Button>
            </div>
          </div>

          {!authLoading && !user ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 px-5 py-8 text-center">
              <p className="text-sm text-slate-300">请先登录后管理 API Key</p>
              <Button
                type="button"
                className="mt-4"
                onClick={() => openAuthDialog()}
              >
                登录
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-6">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="请输入 ID / 描述信息进行搜索"
                  className="max-w-md"
                />
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">API Key</th>
                      <th className="px-4 py-3 font-medium">描述</th>
                      <th className="px-4 py-3 font-medium">状态</th>
                      <th className="px-4 py-3 font-medium">创建时间</th>
                      <th className="px-4 py-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          加载中…
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          暂无 API Key，点击右上角创建
                        </td>
                      </tr>
                    ) : (
                      filtered.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-white/5 text-slate-200 last:border-0"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">
                            {item.id.slice(0, 10)}…
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {item.keyPrefix}
                          </td>
                          <td className="max-w-[12rem] truncate px-4 py-3 text-slate-300">
                            {item.description || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] ${
                                item.enabled
                                  ? "bg-emerald-400/15 text-emerald-200"
                                  : "bg-amber-400/15 text-amber-100"
                              }`}
                            >
                              {item.enabled ? "启用" : "禁用"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {new Date(item.createdAt).toLocaleString("zh-CN", {
                              hour12: false,
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2 text-xs">
                              <button
                                type="button"
                                disabled={busyId === item.id}
                                className="text-cyan-200 hover:underline disabled:opacity-50"
                                onClick={() => void toggleEnabled(item)}
                              >
                                {item.enabled ? "禁用" : "启用"}
                              </button>
                              <button
                                type="button"
                                disabled={busyId === item.id}
                                className="text-cyan-200 hover:underline disabled:opacity-50"
                                onClick={() => setResetTarget(item)}
                              >
                                重置
                              </button>
                              <button
                                type="button"
                                disabled={busyId === item.id}
                                className="text-cyan-200 hover:underline disabled:opacity-50"
                                onClick={() => {
                                  setEditTarget(item);
                                  setEditDescription(item.description);
                                }}
                              >
                                编辑
                              </button>
                              <button
                                type="button"
                                disabled={busyId === item.id}
                                className="text-rose-300 hover:underline disabled:opacity-50"
                                onClick={() => setDeleteTarget(item)}
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </ConsoleSubpageLayout>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          onClose={() => setCreateOpen(false)}
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle>创建 API Key</DialogTitle>
            <DialogDescription>
              权限：全部（可调用当前账号下任意知识库）。明文密钥仅创建时展示一次。
            </DialogDescription>
          </DialogHeader>
          <label className="mt-4 grid gap-1.5 text-sm text-slate-300">
            描述
            <textarea
              value={description}
              maxLength={200}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入描述"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
            />
            <span className="text-right text-xs text-slate-500">
              {description.length} / 200
            </span>
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={creating}
              onClick={() => void handleCreate()}
            >
              {creating ? "创建中…" : "确定"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={secretOpen} onOpenChange={setSecretOpen}>
        <DialogContent
          onClose={() => setSecretOpen(false)}
          className="max-w-lg"
        >
          <DialogHeader>
            <DialogTitle>请保存 API Key</DialogTitle>
            <DialogDescription>
              密钥仅展示一次，关闭后无法再次查看完整内容。请立即复制并妥善保管。
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 break-all rounded-xl border border-cyan-300/30 bg-black/40 px-3 py-3 font-mono text-sm text-cyan-50">
            {plainSecret}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(plainSecret);
                  showToast("已复制", "success");
                } catch {
                  showToast("复制失败", "error");
                }
              }}
            >
              <Copy className="mr-1 h-4 w-4" />
              复制
            </Button>
            <Button type="button" onClick={() => setSecretOpen(false)}>
              我已保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
          }
        }}
      >
        <DialogContent
          onClose={() => setEditTarget(null)}
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle>编辑描述</DialogTitle>
            <DialogDescription>
              {editTarget?.keyPrefix}
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={editDescription}
            maxLength={200}
            rows={4}
            onChange={(e) => setEditDescription(e.target.value)}
            className="mt-4 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditTarget(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={busyId === editTarget?.id}
              onClick={() => void saveEdit()}
            >
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
          }
        }}
      >
        <DialogContent
          onClose={() => setResetTarget(null)}
          className="max-w-sm"
        >
          <DialogHeader>
            <DialogTitle>重置 API Key</DialogTitle>
            <DialogDescription>
              确定重置「{resetTarget?.keyPrefix}」？旧密钥将立即失效，新密钥仅展示一次。
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetTarget(null)}
              disabled={busyId === resetTarget?.id}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={busyId === resetTarget?.id}
              onClick={() => void confirmReset()}
            >
              {busyId === resetTarget?.id ? "重置中…" : "确认重置"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent
          onClose={() => setDeleteTarget(null)}
          className="max-w-sm"
        >
          <DialogHeader>
            <DialogTitle>删除 API Key</DialogTitle>
            <DialogDescription>
              确定删除「{deleteTarget?.keyPrefix}」？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={busyId === deleteTarget?.id}
            >
              取消
            </Button>
            <Button
              type="button"
              className="bg-rose-500 hover:bg-rose-400"
              disabled={busyId === deleteTarget?.id}
              onClick={() => void confirmDelete()}
            >
              {busyId === deleteTarget?.id ? "删除中…" : "确认删除"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
