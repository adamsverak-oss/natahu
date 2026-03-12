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

  const { title, notes, assigneeId, repeatType, repeatEvery } = (await request.json()) as {
    title?: string;
    notes?: string;
    assigneeId?: string;
    repeatType?: "none" | "daily" | "weekly" | "monthly";
    repeatEvery?: number;
  };

  if (!title || !assigneeId) {
    return NextResponse.json({ error: "Missing shopping data" }, { status: 400 });
  }

  await sql`
    insert into shopping_items (title, notes, assignee_id, done, repeat_type, repeat_every)
    values (
      ${title.trim()},
      ${notes?.trim() || null},
      ${assigneeId},
      false,
      ${repeatType ?? "none"},
      ${Math.max(1, repeatEvery ?? 1)}
    )
  `;

  return NextResponse.json({ ok: true });
}
