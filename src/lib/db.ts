import type { Game, GameCreateInput, GameUpdateInput, TelemetryEvent } from "./types";
import { v4 as uuidv4 } from "uuid";

// ── Storage backend ──────────────────────────────────
// Uses Upstash Redis when configured, falls back to in-memory Map

const USE_REDIS = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

let redis: import("@upstash/redis").Redis | null = null;
if (USE_REDIS) {
  const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
  redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

// In-memory fallback
const memStore = new Map<string, Game>();

const GAMES_KEY = "kix:games";
const SEEDED_KEY = "kix:seeded";
let memSeeded = false;

// ── Seed data ──────────────────────────────────────────

const SEED_GAMES: (GameCreateInput & { status: "published" })[] = [
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

function seedMem(): void {
  if (memSeeded) return;
  const now = new Date().toISOString();
  for (const g of SEED_GAMES) {
    const id = uuidv4();
    const game: Game = {
      id, slug: g.slug, title: g.title, description: g.description,
      thumbnail_url: g.thumbnail_url, entry_url: g.entry_url,
      orientation: g.orientation ?? "portrait", status: g.status,
      version: g.version ?? "1.0.0", tags: g.tags ?? [],
      created_at: now, updated_at: now,
    };
    memStore.set(id, game);
  }
  memSeeded = true;
}

async function ensureSeeded(): Promise<void> {
  if (!redis) { seedMem(); return; }

  const seeded = await redis.get(SEEDED_KEY);
  if (seeded) return;

  const existing = await redis.hlen(GAMES_KEY);
  if (existing > 0) {
    await redis.set(SEEDED_KEY, "1");
    return;
  }

  const now = new Date().toISOString();
  for (const g of SEED_GAMES) {
    const id = uuidv4();
    const game: Game = {
      id, slug: g.slug, title: g.title, description: g.description,
      thumbnail_url: g.thumbnail_url, entry_url: g.entry_url,
      orientation: g.orientation ?? "portrait", status: g.status,
      version: g.version ?? "1.0.0", tags: g.tags ?? [],
      created_at: now, updated_at: now,
    };
    await redis.hset(GAMES_KEY, { [id]: JSON.stringify(game) });
  }
  await redis.set(SEEDED_KEY, "1");
}

async function getAllGamesRaw(): Promise<Game[]> {
  await ensureSeeded();

  if (!redis) {
    return Array.from(memStore.values());
  }

  const map: Record<string, string> = (await redis.hgetall(GAMES_KEY)) ?? {};
  return Object.values(map).map((v) =>
    typeof v === "string" ? JSON.parse(v) : v
  );
}

// ── Public API (all async) ──────────────────────────────

export async function getPublishedGames(): Promise<Game[]> {
  const all = await getAllGamesRaw();
  return all
    .filter((g) => g.status === "published")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getAllGames(): Promise<Game[]> {
  const all = await getAllGamesRaw();
  return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getGameById(id: string): Promise<Game | null> {
  await ensureSeeded();

  if (!redis) {
    return memStore.get(id) ?? null;
  }

  const raw = await redis.hget(GAMES_KEY, id);
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw as unknown as Game;
}

export async function getGameBySlug(slug: string): Promise<Game | null> {
  const allGames = await getAllGames();
  return allGames.find((g) => g.slug === slug) ?? null;
}

export async function createGame(input: GameCreateInput): Promise<Game> {
  const allGames = await getAllGames();
  const existing = allGames.find((g) => g.slug === input.slug);
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

  if (redis) {
    await redis.hset(GAMES_KEY, { [id]: JSON.stringify(game) });
  } else {
    memStore.set(id, game);
  }
  return game;
}

export async function updateGame(id: string, input: GameUpdateInput): Promise<Game | null> {
  const existing = await getGameById(id);
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

  if (redis) {
    await redis.hset(GAMES_KEY, { [id]: JSON.stringify(updated) });
  } else {
    memStore.set(id, updated);
  }
  return updated;
}

export async function publishGame(id: string): Promise<Game | null> {
  return updateGame(id, { status: "published" });
}

export async function archiveGame(id: string): Promise<Game | null> {
  return updateGame(id, { status: "archived" });
}

export async function insertEvent(
  eventType: TelemetryEvent["event_type"],
  gameId: string,
  sessionId: string,
  payload: Record<string, unknown> = {}
): Promise<TelemetryEvent> {
  const event: TelemetryEvent = {
    id: uuidv4(),
    event_type: eventType,
    game_id: gameId,
    session_id: sessionId,
    payload,
    created_at: new Date().toISOString(),
  };
  if (redis) {
    redis.lpush("kix:events", JSON.stringify(event)).catch(() => {});
  }
  return event;
}
