"use client";

import { LoginForm } from "@/components/auth-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md border-cyan-300/35 bg-slate-950/90 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClose={() => onOpenChange(false)}
      >
        <DialogHeader className="mb-6 text-center sm:text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Knowledge Studio
          </p>
          <DialogTitle className="mt-2 text-center text-2xl">登录</DialogTitle>
          <DialogDescription className="text-center">
            使用邮箱或手机号登录；未注册账号将自动创建，数据按账号隔离
          </DialogDescription>
        </DialogHeader>
        <LoginForm onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
