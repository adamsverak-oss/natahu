import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { hashSessionToken } from "@/lib/security";
import { sessionCookieName } from "@/lib/session";

export async function POST() {
  const sql = getSql();
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await sql`delete from sessions where token_hash = ${hashSessionToken(token)}`;
  }

  cookieStore.delete(sessionCookieName);
  return NextResponse.json({ ok: true });
}
