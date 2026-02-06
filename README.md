# KiX - Instant Game Hub

A TikTok-style game discovery platform. Swipe through games, tap to play instantly in your browser.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000 to see the game feed.

## Architecture

```
src/
  app/
    page.tsx              # Home - swipeable game feed
    play/[slug]/page.tsx  # Game player (iframe embed)
    admin/page.tsx        # Admin panel UI
    api/v1/
      games/route.ts      # GET /api/v1/games (published games)
      admin/games/        # Admin CRUD endpoints
      events/route.ts     # POST telemetry events
  components/
    GameFeed.tsx          # Vertical swipe feed
    GameCard.tsx          # Individual game card
    GamePlayer.tsx        # Iframe game container
  lib/
    db.ts                 # SQLite database + queries
    types.ts              # TypeScript types
    auth.ts               # Admin token auth
    session.ts            # Client session tracking
    game-sdk-bridge.ts    # GameSDK bridge for iframes
public/
  games/                  # Sample game bundles
    color-tap/
    memory-match/
```

**Tech stack:** Next.js 16, TypeScript, Tailwind CSS v4, SQLite (better-sqlite3)

**Database:** Auto-creates `kix.db` in project root on first request. Seeds 2 sample games.

## Adding a New Game via Admin API

### 1. Create a game (draft)

```bash
curl -X POST http://localhost:3000/api/v1/admin/games \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer kix-admin-secret-change-me" \
  -d '{
    "title": "My Game",
    "slug": "my-game",
    "description": "A fun game",
    "thumbnail_url": "/games/my-game/thumbnail.png",
    "entry_url": "/games/my-game/index.html",
    "orientation": "portrait",
    "tags": ["arcade", "fun"]
  }'
```

### 2. Publish it

```bash
curl -X POST http://localhost:3000/api/v1/admin/games/<GAME_ID>/publish \
  -H "Authorization: Bearer kix-admin-secret-change-me"
```

The game immediately appears in the feed. No redeploy needed.

### 3. Archive it

```bash
curl -X POST http://localhost:3000/api/v1/admin/games/<GAME_ID>/archive \
  -H "Authorization: Bearer kix-admin-secret-change-me"
```

### Admin UI

Visit `/admin` and log in with the admin token. Default: `kix-admin-secret-change-me`

Set a custom token via the `ADMIN_TOKEN` environment variable.

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/games` | No | List published games |
| POST | `/api/v1/admin/games` | Yes | Create game (draft) |
| GET | `/api/v1/admin/games` | Yes | List all games |
| GET | `/api/v1/admin/games/:id` | Yes | Get game by ID |
| PATCH | `/api/v1/admin/games/:id` | Yes | Update game fields |
| POST | `/api/v1/admin/games/:id/publish` | Yes | Publish game |
| POST | `/api/v1/admin/games/:id/archive` | Yes | Archive game |
| POST | `/api/v1/events` | No | Submit telemetry event |

## GameSDK Contract

Each game should expose a `window.GameSDK` object:

```js
window.GameSDK = {
  init(context) {
    // Called with { session_id, game_id, locale, feature_flags }
  },
  start() {
    // Game should begin/resume gameplay
  },
  pause() {
    // Pause gameplay (e.g. user switches tab)
  },
  resume() {
    // Resume from pause
  },
  destroy() {
    // Clean up resources before unload
  }
};
```

**Context object:**

```ts
{
  session_id: string;  // Anonymous session ID
  game_id: string;     // Game UUID
  locale: string;      // e.g. "en"
  feature_flags?: Record<string, boolean>;
}
```

If `GameSDK` is not found on the window, the platform still loads the game - it just skips lifecycle management.

## Game Metadata Schema

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Auto-generated |
| slug | string | URL-friendly identifier (unique) |
| title | string | Display name |
| description | string | Short description |
| thumbnail_url | string | Card thumbnail image |
| entry_url | string | Game HTML entry point |
| orientation | "portrait" \| "landscape" | Display orientation |
| status | "draft" \| "published" \| "archived" | Visibility |
| version | string | Semantic version |
| tags | string[] | Category tags |
| created_at | string | ISO timestamp |
| updated_at | string | ISO timestamp |

## Telemetry Events

Events tracked: `game_card_viewed`, `game_opened`, `game_started`, `game_exit`, `load_error`

```bash
curl -X POST http://localhost:3000/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{"event_type": "game_opened", "game_id": "...", "session_id": "..."}'
```

## Tests

```bash
npm test
```

Tests cover:
- Seeded games appear as published
- Creating a draft game (not visible in feed)
- Publishing a game (appears in feed)
- Archiving a game (disappears from feed)
- Game field updates
- Telemetry event insertion

## Deployment

1. Set `ADMIN_TOKEN` environment variable
2. Build: `npm run build`
3. Start: `npm start`

The SQLite database file (`kix.db`) is created automatically. For production, ensure the process has write access to the working directory.

To serve game assets from a CDN, host the `/public/games/` directory on your CDN and update `entry_url` / `thumbnail_url` accordingly.
