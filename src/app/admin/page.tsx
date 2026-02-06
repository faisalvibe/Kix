"use client";

import { useState, useEffect, useCallback } from "react";
import type { Game, GameCreateInput } from "@/lib/types";

const DEFAULT_TOKEN = "kix-admin-secret-change-me";

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GameCreateInput>({
    title: "",
    slug: "",
    description: "",
    thumbnail_url: "",
    entry_url: "",
    orientation: "portrait",
    version: "1.0.0",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/games", { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setGames(data.games);
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
      }
    } catch {
      // noop
    }
    setLoading(false);
  }, [headers]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchGames();
  };

  const createGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/v1/admin/games", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ ...form, tags: tagInput.split(",").map((t) => t.trim()).filter(Boolean) }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ title: "", slug: "", description: "", thumbnail_url: "", entry_url: "", orientation: "portrait", version: "1.0.0", tags: [] });
      setTagInput("");
      fetchGames();
    }
  };

  const publishGame = async (id: string) => {
    await fetch(`/api/v1/admin/games/${id}/publish`, { method: "POST", headers: headers() });
    fetchGames();
  };

  const archiveGame = async (id: string) => {
    await fetch(`/api/v1/admin/games/${id}/archive`, { method: "POST", headers: headers() });
    fetchGames();
  };

  useEffect(() => {
    if (authenticated) fetchGames();
  }, [authenticated, fetchGames]);

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 rounded-2xl bg-gray-900 p-6">
          <h1 className="text-xl font-bold text-white">KiX Admin</h1>
          <input
            type="password"
            placeholder="Admin token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700"
          >
            Login
          </button>
          <p className="text-xs text-gray-500">
            Default token: {DEFAULT_TOKEN}
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-auto bg-gray-950 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">KiX Admin</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            {showForm ? "Cancel" : "+ Add Game"}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={createGame} className="mb-6 space-y-3 rounded-xl bg-gray-900 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                placeholder="Title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                placeholder="Slug (url-friendly)"
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                placeholder="Entry URL (game HTML)"
                required
                value={form.entry_url}
                onChange={(e) => setForm({ ...form, entry_url: e.target.value })}
                className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                placeholder="Thumbnail URL"
                value={form.thumbnail_url}
                onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                placeholder="Tags (comma separated)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
              />
              <select
                value={form.orientation}
                onChange={(e) => setForm({ ...form, orientation: e.target.value as "portrait" | "landscape" })}
                className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
              rows={2}
            />
            <button
              type="submit"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Create Game (as Draft)
            </button>
          </form>
        )}

        {/* Game list */}
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-3">
            {games.map((game) => (
              <div key={game.id} className="flex items-center justify-between rounded-xl bg-gray-900 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{game.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        game.status === "published"
                          ? "bg-green-500/20 text-green-400"
                          : game.status === "archived"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {game.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-gray-400">{game.slug} &middot; {game.entry_url}</p>
                </div>
                <div className="ml-4 flex gap-2">
                  {game.status !== "published" && (
                    <button
                      onClick={() => publishGame(game.id)}
                      className="rounded-lg bg-green-600/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-600/30"
                    >
                      Publish
                    </button>
                  )}
                  {game.status !== "archived" && (
                    <button
                      onClick={() => archiveGame(game.id)}
                      className="rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-600/30"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            ))}
            {games.length === 0 && (
              <p className="py-8 text-center text-gray-500">No games yet. Add one above!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
