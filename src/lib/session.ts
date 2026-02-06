const SESSION_KEY = "kix_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function trackEvent(
  eventType: string,
  gameId: string,
  payload: Record<string, unknown> = {}
) {
  const sessionId = getSessionId();
  try {
    await fetch("/api/v1/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: eventType,
        game_id: gameId,
        session_id: sessionId,
        payload,
      }),
    });
  } catch {
    // Telemetry is best-effort
  }
}
