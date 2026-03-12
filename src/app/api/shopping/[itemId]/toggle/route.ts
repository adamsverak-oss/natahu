import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/api-auth";
import { getCurrentUser } from "@/lib/session";

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
  const rows = await sql<{ done: boolean }[]>`
    select done
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

  return NextResponse.json({ ok: true });
}
