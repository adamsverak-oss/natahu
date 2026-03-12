import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { unauthorizedResponse } from "@/lib/api-auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  const { body } = (await request.json()) as { body?: string };
  const trimmedBody = body?.trim();
  if (!trimmedBody) {
    return NextResponse.json({ error: "Missing message body" }, { status: 400 });
  }

  const sql = getSql();
  const recent = await sql<{ id: string }[]>`
    select id
    from chat_messages
    where author_id = ${user.id}
      and body = ${trimmedBody}
      and created_at > now() - interval '5 seconds'
    limit 1
  `;

  if (recent[0]) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  await sql`
    insert into chat_messages (body, author_id)
    values (${trimmedBody}, ${user.id})
  `;

  return NextResponse.json({ ok: true });
}
