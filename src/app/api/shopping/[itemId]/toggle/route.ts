import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/api-auth";
import { getCurrentUser } from "@/lib/session";
import { getNextOccurrence } from "@/lib/repeat";

export async function POST(
  _request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  const sql = getSql();
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const { itemId } = await context.params;
  const rows = await sql<{
    done: boolean;
    title: string;
    notes: string | null;
    assigneeId: string;
    repeatType: "none" | "daily" | "weekly" | "monthly";
    repeatEvery: number;
  }[]>`
    select
      done,
      title,
      notes,
      assignee_id as "assigneeId",
      repeat_type as "repeatType",
      repeat_every as "repeatEvery"
    from shopping_items
    where id = ${itemId}
    limit 1
  `;

  const item = rows[0];
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await sql`
    update shopping_items
    set done = ${!item.done}
    where id = ${itemId}
  `;

  if (!item.done && item.repeatType !== "none") {
    const nextDate = getNextOccurrence(new Date().toISOString().slice(0, 10), item.repeatType, item.repeatEvery);

    if (nextDate) {
      await sql`
        insert into shopping_items (
          title,
          notes,
          assignee_id,
          done,
          repeat_type,
          repeat_every,
          created_at
        )
        values (
          ${item.title},
          ${item.notes},
          ${item.assigneeId},
          false,
          ${item.repeatType},
          ${item.repeatEvery},
          ${nextDate}::timestamptz
        )
      `;
    }
  }

  return NextResponse.json({ ok: true });
}
