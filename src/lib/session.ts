import { cookies } from "next/headers";
import { getSql } from "@/lib/db";
import { hashSessionToken } from "@/lib/security";
import type { SessionUser } from "@/lib/types";

export const sessionCookieName = "natahu_session";

export async function getCurrentUser() {
  const sql = getSql();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(sessionCookieName)?.value;

  if (!sessionToken) {
    return null;
  }

  const tokenHash = hashSessionToken(sessionToken);
  const rows = await sql<SessionUser[]>`
    select
      users.id,
      users.name,
      users.username,
      users.color,
      users.avatar,
      users.can_manage as "canManage"
    from sessions
    join users on users.id = sessions.user_id
    where sessions.token_hash = ${tokenHash}
      and sessions.expires_at > now()
    limit 1
  `;

  return rows[0] ?? null;
}
