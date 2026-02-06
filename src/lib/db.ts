import Database from "better-sqlite3";
import path from "path";
import type { Game, GameCreateInput, GameUpdateInput, TelemetryEvent } from "./types";
import { v4 as uuidv4 } from "uuid";

const DB_PATH = path.join(process.cwd(), "kix.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
    seedIfEmpty(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      thumbnail_url TEXT NOT NULL DEFAULT '',
      entry_url TEXT NOT NULL,
      orientation TEXT NOT NULL DEFAULT 'portrait',
      status TEXT NOT NULL DEFAULT 'draft',
      version TEXT NOT NULL DEFAULT '1.0.0',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      game_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
    CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);
    CREATE INDEX IF NOT EXISTS idx_events_game_id ON events(game_id);
    CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
  `);
}

function seedIfEmpty(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) as count FROM games").get() as { count: number };
  if (count.count > 0) return;

  const games: GameCreateInput[] = [
    {
      title: "Color Tap",
      slug: "color-tap",
      description: "Tap the correct color as fast as you can! A fast-paced reflex game that tests your reaction speed.",
      thumbnail_url: "/games/color-tap/thumbnail.svg",
      entry_url: "/games/color-tap/index.html",
      orientation: "portrait",
      version: "1.0.0",
      tags: ["arcade", "reflex", "casual"],
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
    },
  ];

  const insert = db.prepare(`
    INSERT INTO games (id, slug, title, description, thumbnail_url, entry_url, orientation, status, version, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
  `);

  for (const g of games) {
    insert.run(
      uuidv4(),
      g.slug,
      g.title,
      g.description,
      g.thumbnail_url,
      g.entry_url,
      g.orientation ?? "portrait",
      g.version ?? "1.0.0",
      JSON.stringify(g.tags ?? [])
    );
  }
}

function rowToGame(row: Record<string, unknown>): Game {
  return {
    ...row,
    tags: JSON.parse(row.tags as string),
  } as Game;
}

// ── Public API ──────────────────────────────────────────

export function getPublishedGames(): Game[] {
  const rows = getDb()
    .prepare("SELECT * FROM games WHERE status = 'published' ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(rowToGame);
}

export function getAllGames(): Game[] {
  const rows = getDb()
    .prepare("SELECT * FROM games ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(rowToGame);
}

export function getGameById(id: string): Game | null {
  const row = getDb().prepare("SELECT * FROM games WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToGame(row) : null;
}

export function getGameBySlug(slug: string): Game | null {
  const row = getDb().prepare("SELECT * FROM games WHERE slug = ?").get(slug) as Record<string, unknown> | undefined;
  return row ? rowToGame(row) : null;
}

export function createGame(input: GameCreateInput): Game {
  const id = uuidv4();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO games (id, slug, title, description, thumbnail_url, entry_url, orientation, status, version, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)
  `).run(
    id,
    input.slug,
    input.title,
    input.description,
    input.thumbnail_url,
    input.entry_url,
    input.orientation ?? "portrait",
    input.version ?? "1.0.0",
    JSON.stringify(input.tags ?? []),
    now,
    now
  );
  return getGameById(id)!;
}

export function updateGame(id: string, input: GameUpdateInput): Game | null {
  const existing = getGameById(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.title !== undefined) { fields.push("title = ?"); values.push(input.title); }
  if (input.slug !== undefined) { fields.push("slug = ?"); values.push(input.slug); }
  if (input.description !== undefined) { fields.push("description = ?"); values.push(input.description); }
  if (input.thumbnail_url !== undefined) { fields.push("thumbnail_url = ?"); values.push(input.thumbnail_url); }
  if (input.entry_url !== undefined) { fields.push("entry_url = ?"); values.push(input.entry_url); }
  if (input.orientation !== undefined) { fields.push("orientation = ?"); values.push(input.orientation); }
  if (input.version !== undefined) { fields.push("version = ?"); values.push(input.version); }
  if (input.tags !== undefined) { fields.push("tags = ?"); values.push(JSON.stringify(input.tags)); }
  if (input.status !== undefined) { fields.push("status = ?"); values.push(input.status); }

  if (fields.length === 0) return existing;

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  getDb().prepare(`UPDATE games SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getGameById(id)!;
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
  const id = uuidv4();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO events (id, event_type, game_id, session_id, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, eventType, gameId, sessionId, JSON.stringify(payload), now);
  return { id, event_type: eventType, game_id: gameId, session_id: sessionId, payload, created_at: now };
}
