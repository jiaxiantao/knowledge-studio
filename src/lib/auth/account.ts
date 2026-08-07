/** Normalize and classify login/register account (email or China mobile). */

export type AccountKind = "email" | "phone";

export type ParsedAccount =
  | { kind: "email"; email: string; phone: null }
  | { kind: "phone"; email: null; phone: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Mainland China mobile: 1 + 10 digits. */
const PHONE_RE = /^1\d{10}$/;

export function normalizeAccountInput(raw: string): string {
  return raw.trim().replace(/[\s-]/g, "");
}

export function parseAccount(raw: string): ParsedAccount | null {
  const value = normalizeAccountInput(raw);
  if (!value) {
    return null;
  }

  if (value.includes("@")) {
    const email = value.toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 200) {
      return null;
    }
    return { kind: "email", email, phone: null };
  }

  const digits = value.replace(/^\+86/, "");
  if (!PHONE_RE.test(digits)) {
    return null;
  }
  return { kind: "phone", email: null, phone: digits };
}

export function accountErrorMessage(raw: string): string {
  const value = normalizeAccountInput(raw);
  if (!value) {
    return "请输入邮箱或手机号";
  }
  if (value.includes("@")) {
    return "请输入有效邮箱";
  }
  return "请输入有效手机号（11 位）";
}

export function displayAccount(user: {
  email?: string | null;
  phone?: string | null;
}): string {
  return user.email || user.phone || "";
}
