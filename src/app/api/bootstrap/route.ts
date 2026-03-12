import { NextResponse } from "next/server";
import { unauthorizedResponse } from "@/lib/api-auth";
import { readAppData } from "@/lib/store";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const data = await readAppData();
    return NextResponse.json({ user, data });
  } catch (error) {
    console.error("Bootstrap failed", error);
    return NextResponse.json(
      {
        error: "Bootstrap failed",
        hint: "Zkontroluj DATABASE_URL a spust databazovy setup.",
      },
      { status: 500 }
    );
  }
}
