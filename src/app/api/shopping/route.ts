import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/api-auth";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  const sql = getSql();
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  if (!user.canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, assigneeId } = (await request.json()) as {
    title?: string;
    assigneeId?: string;
  };

  if (!title || !assigneeId) {
    return NextResponse.json({ error: "Missing shopping data" }, { status: 400 });
  }

  await sql`
    insert into shopping_items (title, assignee_id, done)
    values (${title.trim()}, ${assigneeId}, false)
  `;

  return NextResponse.json({ ok: true });
}
