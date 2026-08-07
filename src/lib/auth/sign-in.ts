import { claimOrphanData, toPublicUser } from "@/lib/auth/claim";
import {
  accountErrorMessage,
  parseAccount,
  type ParsedAccount,
} from "@/lib/auth/account";
import { signAuthToken } from "@/lib/auth/jwt";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getReadyDb } from "@/lib/db";

function defaultDisplayName(identity: ParsedAccount): string {
  if (identity.kind === "email") {
    const local = identity.email.split("@")[0]?.trim();
    return local && local.length > 0 ? local.slice(0, 64) : "用户";
  }
  return `用户${identity.phone.slice(-4)}`;
}

/**
 * Login if account exists; otherwise create the account (登录即注册).
 */
export async function authenticateOrRegister(input: {
  account: string;
  password: string;
}): Promise<
  | { ok: true; token: string; user: ReturnType<typeof toPublicUser>; created: boolean }
  | { ok: false; status: number; error: string }
> {
  const identity = parseAccount(input.account);
  if (!identity) {
    return {
      ok: false,
      status: 400,
      error: accountErrorMessage(input.account),
    };
  }

  const password = input.password;
  if (!password || password.length > 128) {
    return { ok: false, status: 400, error: "请输入密码" };
  }

  const db = await getReadyDb();
  if (!db) {
    return { ok: false, status: 503, error: "数据库不可用" };
  }

  const existing =
    identity.kind === "email"
      ? await db.user.findUnique({ where: { email: identity.email } })
      : await db.user.findUnique({ where: { phone: identity.phone } });

  if (existing) {
    const ok = await verifyPassword(password, existing.passwordHash);
    if (!ok) {
      return { ok: false, status: 401, error: "账号或密码错误" };
    }
    await claimOrphanData(existing.id);
    const publicUser = toPublicUser(existing);
    const token = await signAuthToken(publicUser);
    return { ok: true, token, user: publicUser, created: false };
  }

  if (password.length < 6) {
    return {
      ok: false,
      status: 400,
      error: "新账号密码至少 6 位",
    };
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      email: identity.email,
      phone: identity.phone,
      name: defaultDisplayName(identity),
      passwordHash,
    },
  });

  await claimOrphanData(user.id);

  const publicUser = toPublicUser(user);
  const token = await signAuthToken(publicUser);
  return { ok: true, token, user: publicUser, created: true };
}
