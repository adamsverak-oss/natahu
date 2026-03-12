import { NextResponse } from "next/server";
import { unauthorizedResponse } from "@/lib/api-auth";
import { readAppData } from "@/lib/store";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const data = await readAppData();
  return NextResponse.json({ user, data });
}
