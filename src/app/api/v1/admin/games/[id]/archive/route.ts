import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { archiveGame } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const game = await archiveGame(id);

  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  return NextResponse.json({ game });
}
