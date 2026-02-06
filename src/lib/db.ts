import type { Game, GameCreateInput, GameUpdateInput, TelemetryEvent } from "./types";
import { v4 as uuidv4 } from "uuid";

// ── In-memory store (seeds automatically) ──────────────

const games: Map<string, Game> = new Map();
const events: TelemetryEvent[] = [];

function seed() {
  if (games.size > 0) return;

  const seedGames: (GameCreateInput & { status: "published" })[] = [
    {
      title: "Color Tap",
      slug: "color-tap",
      description: "Tap the correct color as fast as you can! A fast-paced reflex game that tests your reaction speed.",
      thumbnail_url: "/games/color-tap/thumbnail.svg",
      entry_url: "/games/color-tap/index.html",
      orientation: "portrait",
      version: "1.0.0",
      tags: ["arcade", "reflex", "casual"],
      status: "published",
    },
    {
      title: "Memory Match",
      slug: "memory-match",
      description: "Flip cards and find matching pairs. Train your memory with this classic card matching game!",
      thumbnail_url: "/games/memory-match/thumbnail.svg",
      entry_url: "/games/memory-match/index.html",
      orientation: "portrait",
      version: "1.0.0",
      tags: ["puzzle", "memory", "casual"],
      status: "published",
    },
  ];

  const now = new Date().toISOString();
  for (const g of seedGames) {
    const id = uuidv4();
    games.set(id, {
      id,
      slug: g.slug,
      title: g.title,
      description: g.description,
      thumbnail_url: g.thumbnail_url,
      entry_url: g.entry_url,
      orientation: g.orientation ?? "portrait",
      status: g.status,
      version: g.version ?? "1.0.0",
      tags: g.tags ?? [],
      created_at: now,
      updated_at: now,
    });
  }
}

// Auto-seed on import
seed();

// ── Public API ──────────────────────────────────────────

export function getPublishedGames(): Game[] {
  return Array.from(games.values())
    .filter((g) => g.status === "published")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getAllGames(): Game[] {
  return Array.from(games.values())
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getGameById(id: string): Game | null {
  return games.get(id) ?? null;
}

export function getGameBySlug(slug: string): Game | null {
  return Array.from(games.values()).find((g) => g.slug === slug) ?? null;
}

export function createGame(input: GameCreateInput): Game {
  const existing = getGameBySlug(input.slug);
  if (existing) throw new Error("UNIQUE constraint failed: games.slug");

  const id = uuidv4();
  const now = new Date().toISOString();
  const game: Game = {
    id,
    slug: input.slug,
    title: input.title,
    description: input.description,
    thumbnail_url: input.thumbnail_url,
    entry_url: input.entry_url,
    orientation: input.orientation ?? "portrait",
    status: "draft",
    version: input.version ?? "1.0.0",
    tags: input.tags ?? [],
    created_at: now,
    updated_at: now,
  };
  games.set(id, game);
  return game;
}

export function updateGame(id: string, input: GameUpdateInput): Game | null {
  const existing = games.get(id);
  if (!existing) return null;

  const updated: Game = {
    ...existing,
    ...(input.title !== undefined && { title: input.title }),
    ...(input.slug !== undefined && { slug: input.slug }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.thumbnail_url !== undefined && { thumbnail_url: input.thumbnail_url }),
    ...(input.entry_url !== undefined && { entry_url: input.entry_url }),
    ...(input.orientation !== undefined && { orientation: input.orientation }),
    ...(input.version !== undefined && { version: input.version }),
    ...(input.tags !== undefined && { tags: input.tags }),
    ...(input.status !== undefined && { status: input.status }),
    updated_at: new Date().toISOString(),
  };
  games.set(id, updated);
  return updated;
}

export function publishGame(id: string): Game | null {
  return updateGame(id, { status: "published" });
}

export function archiveGame(id: string): Game | null {
  return updateGame(id, { status: "archived" });
}

export function insertEvent(
  eventType: TelemetryEvent["event_type"],
  gameId: string,
  sessionId: string,
  payload: Record<string, unknown> = {}
): TelemetryEvent {
  const event: TelemetryEvent = {
    id: uuidv4(),
    event_type: eventType,
    game_id: gameId,
    session_id: sessionId,
    payload,
    created_at: new Date().toISOString(),
  };
  events.push(event);
  return event;
}
