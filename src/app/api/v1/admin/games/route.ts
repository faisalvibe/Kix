import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createGame, getAllGames } from "@/lib/db";
import type { GameCreateInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const games = await getAllGames();
  return NextResponse.json({ games });
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const body = await request.json() as GameCreateInput;

  if (!body.title || !body.slug || !body.entry_url) {
    return NextResponse.json(
      { error: "title, slug, and entry_url are required" },
      { status: 400 }
    );
  }

  try {
    const game = await createGame(body);
    return NextResponse.json({ game }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "A game with this slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
