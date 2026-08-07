import { getReadyDb } from "@/lib/db";
import { displayAccount } from "@/lib/auth/account";

/**
 * Assign orphan (userId=null) knowledge bases and chat sessions to the first
 * user who logs in / registers after migration. Later users get an empty slate.
 */
export async function claimOrphanData(userId: string): Promise<void> {
  const db = await getReadyDb();
  if (!db) {
    return;
  }

  const orphanKbCount = await db.knowledgeBase.count({
    where: { userId: null },
  });
  const orphanSessionCount = await db.chatSession.count({
    where: { userId: null },
  });

  if (orphanKbCount === 0 && orphanSessionCount === 0) {
    return;
  }

  await db.$transaction([
    db.knowledgeBase.updateMany({
      where: { userId: null },
      data: { userId },
    }),
    db.chatSession.updateMany({
      where: { userId: null },
      data: { userId },
    }),
  ]);
}

export function toPublicUser(user: {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
}) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    account: displayAccount(user),
  };
}
