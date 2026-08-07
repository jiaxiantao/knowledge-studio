import { clearAuthToken, getAuthToken } from "@/lib/auth-client";

export class ApiAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
  }
}

/**
 * fetch wrapper: attaches Bearer token and clears it on 401.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    const hadToken = Boolean(token);
    clearAuthToken();
    // Only notify when a real session expired — guest 401 must not trigger reload loops.
    if (hadToken && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ks:auth-expired"));
    }
  }

  return response;
}
