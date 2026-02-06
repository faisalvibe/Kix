import { NextRequest, NextResponse } from "next/server";
import { insertEvent } from "@/lib/db";
import type { TelemetryEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_EVENT_TYPES: TelemetryEvent["event_type"][] = [
  "game_card_viewed",
  "game_opened",
  "game_started",
  "game_exit",
  "load_error",
];

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { event_type, game_id, session_id, payload } = body;

  if (!event_type || !game_id || !session_id) {
    return NextResponse.json(
      { error: "event_type, game_id, and session_id are required" },
      { status: 400 }
    );
  }

  if (!VALID_EVENT_TYPES.includes(event_type)) {
    return NextResponse.json(
      { error: `Invalid event_type. Must be one of: ${VALID_EVENT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const event = insertEvent(event_type, game_id, session_id, payload ?? {});
  return NextResponse.json({ event }, { status: 201 });
}
