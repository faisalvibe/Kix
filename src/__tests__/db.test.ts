import { describe, it, expect } from "vitest";
import {
  getPublishedGames,
  getAllGames,
  getGameById,
  getGameBySlug,
  createGame,
  updateGame,
  publishGame,
  archiveGame,
  insertEvent,
} from "@/lib/db";

describe("Game Catalog", () => {
  // DB auto-seeds with 2 published games on first access

  it("should have seeded 2 published games", async () => {
    const games = await getPublishedGames();
    expect(games.length).toBe(2);
    expect(games.map((g) => g.slug).sort()).toEqual(["color-tap", "memory-match"]);
  });

  it("published games should have correct fields", async () => {
    const games = await getPublishedGames();
    const game = games.find((g) => g.slug === "color-tap")!;
    expect(game.title).toBe("Color Tap");
    expect(game.status).toBe("published");
    expect(game.orientation).toBe("portrait");
    expect(game.entry_url).toBe("/games/color-tap/index.html");
    expect(Array.isArray(game.tags)).toBe(true);
    expect(game.tags).toContain("arcade");
  });

  it("should create a new game as draft", async () => {
    const game = await createGame({
      title: "Test Game",
      slug: "test-game",
      description: "A test game",
      thumbnail_url: "/test.png",
      entry_url: "/games/test/index.html",
      tags: ["test"],
    });
    expect(game.id).toBeDefined();
    expect(game.status).toBe("draft");
    expect(game.title).toBe("Test Game");
    expect(game.tags).toEqual(["test"]);
  });

  it("draft game should NOT appear in published list", async () => {
    const published = await getPublishedGames();
    const found = published.find((g) => g.slug === "test-game");
    expect(found).toBeUndefined();
  });

  it("draft game should appear in all games list (admin)", async () => {
    const all = await getAllGames();
    const found = all.find((g) => g.slug === "test-game");
    expect(found).toBeDefined();
    expect(found!.status).toBe("draft");
  });

  it("should publish a draft game", async () => {
    const all = await getAllGames();
    const draft = all.find((g) => g.slug === "test-game")!;
    const published = await publishGame(draft.id);
    expect(published).not.toBeNull();
    expect(published!.status).toBe("published");

    // Now it should appear in published list
    const publishedList = await getPublishedGames();
    const found = publishedList.find((g) => g.slug === "test-game");
    expect(found).toBeDefined();
  });

  it("should archive a game and remove it from published list", async () => {
    const all = await getAllGames();
    const game = all.find((g) => g.slug === "test-game")!;
    const archived = await archiveGame(game.id);
    expect(archived).not.toBeNull();
    expect(archived!.status).toBe("archived");

    // Should no longer be in published list
    const publishedList = await getPublishedGames();
    const found = publishedList.find((g) => g.slug === "test-game");
    expect(found).toBeUndefined();
  });

  it("should update game fields", async () => {
    const all = await getAllGames();
    const game = all.find((g) => g.slug === "color-tap")!;
    const updated = await updateGame(game.id, { title: "Color Tap v2", version: "2.0.0" });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe("Color Tap v2");
    expect(updated!.version).toBe("2.0.0");
    // Unchanged fields remain
    expect(updated!.slug).toBe("color-tap");
  });

  it("should find game by slug", async () => {
    const game = await getGameBySlug("memory-match");
    expect(game).not.toBeNull();
    expect(game!.title).toBe("Memory Match");
  });

  it("should return null for nonexistent game", async () => {
    const game = await getGameById("nonexistent-id");
    expect(game).toBeNull();
    const game2 = await getGameBySlug("nonexistent-slug");
    expect(game2).toBeNull();
  });
});

describe("Telemetry Events", () => {
  it("should insert a telemetry event", async () => {
    const event = await insertEvent("game_opened", "some-game-id", "session-123", { screen: "feed" });
    expect(event.id).toBeDefined();
    expect(event.event_type).toBe("game_opened");
    expect(event.game_id).toBe("some-game-id");
    expect(event.session_id).toBe("session-123");
    expect(event.payload).toEqual({ screen: "feed" });
  });

  it("should insert events with different types", async () => {
    const types = ["game_card_viewed", "game_started", "game_exit", "load_error"] as const;
    for (const type of types) {
      const event = await insertEvent(type, "game-1", "session-1");
      expect(event.event_type).toBe(type);
    }
  });
});
