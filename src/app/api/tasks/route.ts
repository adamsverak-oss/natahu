import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/api-auth";
import { getCurrentUser } from "@/lib/session";
import { getRepeatLabel } from "@/lib/repeat";

export async function POST(request: Request) {
  const sql = getSql();
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  if (!user.canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, assigneeId, date, time, repeatType, repeatEvery } = (await request.json()) as {
    repeatType?: "none" | "daily" | "weekly" | "monthly";
    repeatEvery?: number;
    title?: string;
    assigneeId?: string;
    date?: string;
    time?: string;
  };

  if (!title || !assigneeId || !date) {
    return NextResponse.json({ error: "Missing task data" }, { status: 400 });
  }

  const resolvedRepeatType = repeatType ?? "none";
  const resolvedRepeatEvery = Math.max(1, repeatEvery ?? 1);
  const repeatLabel = getRepeatLabel(resolvedRepeatType, resolvedRepeatEvery);

  await sql`
    insert into tasks (title, assignee_id, task_date, task_time, repeat_type, repeat_every, repeat_label, done)
    values (
      ${title.trim()},
      ${assigneeId},
      ${date},
      ${time || null},
      ${resolvedRepeatType},
      ${resolvedRepeatEvery},
      ${repeatLabel},
      false
    )
  `;

  return NextResponse.json({ ok: true });
}
