export type GameStatus = "draft" | "published" | "archived";
export type GameOrientation = "portrait" | "landscape";

export interface Game {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnail_url: string;
  entry_url: string;
  orientation: GameOrientation;
  status: GameStatus;
  version: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface GameCreateInput {
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string;
  entry_url: string;
  orientation?: GameOrientation;
  version?: string;
  tags?: string[];
}

export interface GameUpdateInput {
  title?: string;
  slug?: string;
  description?: string;
  thumbnail_url?: string;
  entry_url?: string;
  orientation?: GameOrientation;
  version?: string;
  tags?: string[];
  status?: GameStatus;
}

export interface TelemetryEvent {
  id: string;
  event_type: "game_card_viewed" | "game_opened" | "game_started" | "game_exit" | "load_error";
  game_id: string;
  session_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface GameSDKContext {
  session_id: string;
  game_id: string;
  locale: string;
  feature_flags?: Record<string, boolean>;
}
