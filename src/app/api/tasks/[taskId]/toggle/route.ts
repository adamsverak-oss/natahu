import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/api-auth";
import { getCurrentUser } from "@/lib/session";
import { getNextOccurrence } from "@/lib/repeat";

export async function POST(
  _request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const sql = getSql();
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const { taskId } = await context.params;
  const rows = await sql<{
    assigneeId: string;
    done: boolean;
    title: string;
    notes: string | null;
    date: string;
    time: string | null;
    priority: "low" | "medium" | "high";
    repeatType: "none" | "daily" | "weekly" | "monthly";
    repeatEvery: number;
    repeatLabel: string;
  }[]>`
    select
      assignee_id as "assigneeId",
      done,
      title,
      notes,
      task_date::text as date,
      task_time::text as time,
      priority,
      repeat_type as "repeatType",
      repeat_every as "repeatEvery",
      repeat_label as "repeatLabel"
    from tasks
    where id = ${taskId}
    limit 1
  `;

  const task = rows[0];
  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (task.assigneeId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const nextDone = !task.done;
  await sql`
    update tasks
    set
      done = ${nextDone},
      completed_at = ${task.done ? null : new Date().toISOString()}
    where id = ${taskId}
  `;

  if (nextDone) {
    await sql`
      insert into task_history (task_id, title, notes, assignee_id, priority, completed_at)
      values (
        ${taskId},
        ${task.title},
        ${task.notes},
        ${task.assigneeId},
        ${task.priority},
        ${new Date().toISOString()}
      )
    `;
  }

  if (nextDone && task.repeatType !== "none") {
    const nextDate = getNextOccurrence(task.date, task.repeatType, task.repeatEvery);

    if (nextDate) {
      const exists = await sql<{ id: string }[]>`
        select id
        from tasks
        where title = ${task.title}
          and assignee_id = ${task.assigneeId}
          and task_date = ${nextDate}
          and coalesce(task_time::text, '') = ${task.time ?? ""}
          and repeat_type = ${task.repeatType}
          and repeat_every = ${task.repeatEvery}
        limit 1
      `;

      if (exists.length === 0) {
        await sql`
          insert into tasks (
            title,
            notes,
            assignee_id,
            task_date,
            task_time,
            priority,
            repeat_type,
            repeat_every,
            repeat_label,
            done
          )
          values (
            ${task.title},
            ${task.notes},
            ${task.assigneeId},
            ${nextDate},
            ${task.time},
            ${task.priority},
            ${task.repeatType},
            ${task.repeatEvery},
            ${task.repeatLabel},
            false
          )
        `;
      }
    }
  }

  return NextResponse.json({ ok: true });
}
