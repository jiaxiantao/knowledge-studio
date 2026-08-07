"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";

/** Deep-link: open sign-in dialog on the console home. */
export default function LoginPage() {
  const router = useRouter();
  const { openAuthDialog } = useAuth();

  useEffect(() => {
    openAuthDialog();
    router.replace("/knowledge");
  }, [openAuthDialog, router]);

  return null;
}
