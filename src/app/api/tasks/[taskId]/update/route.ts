import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { unauthorizedResponse } from "@/lib/api-auth";
import { getRepeatLabel } from "@/lib/repeat";

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();
  if (!user.canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { taskId } = await context.params;
  const body = (await request.json()) as {
    title?: string;
    notes?: string;
    assigneeId?: string;
    date?: string;
    time?: string | null;
    priority?: "low" | "medium" | "high";
    repeatType?: "none" | "daily" | "weekly" | "monthly";
    repeatEvery?: number;
  };

  if (!body.title || !body.assigneeId || !body.date) {
    return NextResponse.json({ error: "Missing task data" }, { status: 400 });
  }

  const repeatType = body.repeatType ?? "none";
  const repeatEvery = Math.max(1, body.repeatEvery ?? 1);
  const sql = getSql();

  await sql`
    update tasks
    set
      title = ${body.title.trim()},
      notes = ${body.notes?.trim() || null},
      assignee_id = ${body.assigneeId},
      task_date = ${body.date},
      task_time = ${body.time || null},
      priority = ${body.priority ?? "medium"},
      repeat_type = ${repeatType},
      repeat_every = ${repeatEvery},
      repeat_label = ${getRepeatLabel(repeatType, repeatEvery)}
    where id = ${taskId}
  `;

  return NextResponse.json({ ok: true });
}
