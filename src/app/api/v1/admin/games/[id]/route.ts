import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getGameById, updateGame } from "@/lib/db";
import type { GameUpdateInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const game = await getGameById(id);
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  return NextResponse.json({ game });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json() as GameUpdateInput;
  const game = await updateGame(id, body);

  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  return NextResponse.json({ game });
}
