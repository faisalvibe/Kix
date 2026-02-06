import { NextResponse } from "next/server";
import { getPublishedGames } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const games = getPublishedGames();
  return NextResponse.json({ games });
}
