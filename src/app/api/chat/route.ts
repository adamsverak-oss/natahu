import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { unauthorizedResponse } from "@/lib/api-auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  const { body } = (await request.json()) as { body?: string };
  if (!body?.trim()) {
    return NextResponse.json({ error: "Missing message body" }, { status: 400 });
  }

  const sql = getSql();
  await sql`
    insert into chat_messages (body, author_id)
    values (${body.trim()}, ${user.id})
  `;

  return NextResponse.json({ ok: true });
}
