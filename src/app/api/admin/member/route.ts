import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { unauthorizedResponse } from "@/lib/api-auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();
  if (!user.canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, color, avatar } = (await request.json()) as {
    userId?: string;
    color?: string;
    avatar?: string;
  };

  if (!userId || !color || !avatar?.trim()) {
    return NextResponse.json({ error: "Missing member data" }, { status: 400 });
  }

  const sql = getSql();
  await sql`
    update users
    set color = ${color}, avatar = ${avatar.trim().slice(0, 2).toUpperCase()}
    where id = ${userId}
  `;

  return NextResponse.json({ ok: true });
}
