import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { unauthorizedResponse } from "@/lib/api-auth";

const MAX_IMAGE_SIZE = 1_600_000;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  const { imageUrl, caption } = (await request.json()) as {
    imageUrl?: string;
    caption?: string;
  };

  if (!imageUrl?.startsWith("data:image/")) {
    return NextResponse.json({ error: "Missing image" }, { status: 400 });
  }

  if (imageUrl.length > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "Image too large" }, { status: 400 });
  }

  const sql = getSql();
  await sql`
    insert into photo_posts (image_url, caption, author_id)
    values (${imageUrl}, ${caption?.trim() || null}, ${user.id})
  `;

  return NextResponse.json({ ok: true });
}
