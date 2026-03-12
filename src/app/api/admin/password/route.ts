import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { hashPassword } from "@/lib/security";
import { getCurrentUser } from "@/lib/session";
import { unauthorizedResponse } from "@/lib/api-auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  if (!user.canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, newPassword } = (await request.json()) as {
    userId?: string;
    newPassword?: string;
  };

  if (!userId || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "Invalid password data" }, { status: 400 });
  }

  const sql = getSql();
  await sql`
    update users
    set password_hash = ${hashPassword(newPassword)}
    where id = ${userId}
  `;

  await sql`
    delete from sessions
    where user_id = ${userId}
  `;

  return NextResponse.json({ ok: true });
}
