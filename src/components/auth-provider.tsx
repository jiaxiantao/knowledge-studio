"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { AuthDialog } from "@/components/auth-dialog";
import { apiFetch } from "@/lib/api-fetch";
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
  type PublicUser,
} from "@/lib/auth-client";

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  /** 登录即注册 */
  signIn: (account: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  openAuthDialog: () => void;
  closeAuthDialog: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `请求失败 (${response.status})`;
  } catch {
    return `请求失败 (${response.status})`;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await apiFetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        clearAuthToken();
        setUser(null);
        return;
      }
      const payload = (await response.json()) as { user: PublicUser };
      setUser(payload.user);
    } catch {
      clearAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Bootstrap session from localStorage JWT (external system → React state).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional auth hydrate
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      // One-shot reload after a previously valid session expired.
      window.location.reload();
    };
    window.addEventListener("ks:auth-expired", onExpired);
    return () => window.removeEventListener("ks:auth-expired", onExpired);
  }, []);

  const openAuthDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const closeAuthDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const signIn = useCallback(async (account: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, password }),
    });
    if (!response.ok) {
      throw new Error(await readError(response));
    }
    const payload = (await response.json()) as {
      token: string;
      user: PublicUser;
    };
    setAuthToken(payload.token);
    window.location.reload();
  }, []);

  const logout = useCallback(async () => {
    try {
      // Use bare fetch — logout is public; avoid 401 side-effects on apiFetch.
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearAuthToken();
    window.location.reload();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      logout,
      refresh,
      openAuthDialog,
      closeAuthDialog,
    }),
    [user, loading, signIn, logout, refresh, openAuthDialog, closeAuthDialog],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
