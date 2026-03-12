import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { unauthorizedResponse } from "@/lib/api-auth";

export async function POST(
  _request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();
  if (!user.canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { itemId } = await context.params;
  const sql = getSql();
  await sql`delete from shopping_items where id = ${itemId}`;
  return NextResponse.json({ ok: true });
}
