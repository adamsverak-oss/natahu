import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { createSessionToken, hashSessionToken, verifyPassword } from "@/lib/security";
import { sessionCookieName } from "@/lib/session";

type LoginRow = {
  id: string;
  passwordHash: string;
};

export async function POST(request: Request) {
  const sql = getSql();
  const { username, password } = (await request.json()) as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const rows = await sql<LoginRow[]>`
    select id, password_hash as "passwordHash"
    from users
    where username = ${username}
    limit 1
  `;

  const user = rows[0];
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const sessionToken = createSessionToken();
  const tokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await sql`
    insert into sessions (token_hash, user_id, expires_at)
    values (${tokenHash}, ${user.id}, ${expiresAt.toISOString()})
  `;

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
