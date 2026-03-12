import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { unauthorizedResponse } from "@/lib/api-auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();
  if (!user.canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { itemId } = await context.params;
  const body = (await request.json()) as {
    title?: string;
    notes?: string;
    assigneeId?: string;
    repeatType?: "none" | "daily" | "weekly" | "monthly";
    repeatEvery?: number;
  };

  if (!body.title || !body.assigneeId) {
    return NextResponse.json({ error: "Missing shopping data" }, { status: 400 });
  }

  const sql = getSql();
  await sql`
    update shopping_items
    set
      title = ${body.title.trim()},
      notes = ${body.notes?.trim() || null},
      assignee_id = ${body.assigneeId},
      repeat_type = ${body.repeatType ?? "none"},
      repeat_every = ${Math.max(1, body.repeatEvery ?? 1)}
    where id = ${itemId}
  `;

  return NextResponse.json({ ok: true });
}
