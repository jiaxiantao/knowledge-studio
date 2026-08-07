import { SignJWT, jwtVerify } from "jose";

import { displayAccount } from "@/lib/auth/account";

export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  account: string;
};

type JwtPayload = {
  sub: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  account: string;
};

function getSecretKey() {
  const secret = process.env.AUTH_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

function getExpiresIn(): string {
  return process.env.AUTH_JWT_EXPIRES_IN?.trim() || "7d";
}

export async function signAuthToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    name: user.name,
    email: user.email,
    phone: user.phone,
    account: user.account || displayAccount(user),
  } satisfies Omit<JwtPayload, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(getExpiresIn())
    .sign(getSecretKey());
}

export async function verifyAuthToken(
  token: string,
): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const id = typeof payload.sub === "string" ? payload.sub : null;
    const name = typeof payload.name === "string" ? payload.name : null;
    const email =
      typeof payload.email === "string" ? payload.email : null;
    const phone =
      typeof payload.phone === "string" ? payload.phone : null;
    const account =
      typeof payload.account === "string"
        ? payload.account
        : displayAccount({ email, phone });
    if (!id || !name || !account) {
      return null;
    }
    return { id, name, email, phone, account };
  } catch {
    return null;
  }
}
