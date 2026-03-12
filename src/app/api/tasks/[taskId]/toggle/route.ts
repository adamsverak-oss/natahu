import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/api-auth";
import { getCurrentUser } from "@/lib/session";

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
  const rows = await sql<{ assigneeId: string; done: boolean }[]>`
    select assignee_id as "assigneeId", done
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

  await sql`
    update tasks
    set
      done = ${!task.done},
      completed_at = ${task.done ? null : new Date().toISOString()}
    where id = ${taskId}
  `;

  return NextResponse.json({ ok: true });
}
