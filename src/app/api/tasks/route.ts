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

  const { title, assigneeId, date, time } = (await request.json()) as {
    title?: string;
    assigneeId?: string;
    date?: string;
    time?: string;
  };

  if (!title || !assigneeId || !date) {
    return NextResponse.json({ error: "Missing task data" }, { status: 400 });
  }

  await sql`
    insert into tasks (title, assignee_id, task_date, task_time, repeat_label, done)
    values (${title.trim()}, ${assigneeId}, ${date}, ${time || null}, 'Jednorazove', false)
  `;

  return NextResponse.json({ ok: true });
}
