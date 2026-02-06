"use client";

import { useEffect, useRef } from "react";
import type { Game } from "@/lib/types";
import { trackEvent } from "@/lib/session";

interface GameCardProps {
  game: Game;
  isActive: boolean;
  onPlay: (game: Game) => void;
}

export default function GameCard({ game, isActive, onPlay }: GameCardProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (isActive && !tracked.current) {
      tracked.current = true;
      trackEvent("game_card_viewed", game.id);
    }
  }, [isActive, game.id]);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-6">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-black" />

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6">
        {/* Thumbnail */}
        <div className="relative aspect-square w-full max-w-[280px] overflow-hidden rounded-3xl shadow-2xl shadow-purple-500/20">
          {game.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={game.thumbnail_url}
              alt={game.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
              <span className="text-6xl font-bold text-white">
                {game.title.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Game info */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl font-bold text-white">{game.title}</h2>
          <p className="text-sm leading-relaxed text-gray-400">
            {game.description}
          </p>

          {/* Tags */}
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            {game.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Play button */}
        <button
          onClick={() => onPlay(game)}
          className="mt-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/40 transition-transform active:scale-95"
        >
          <svg className="ml-1 h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>

      {/* Swipe hint */}
      {isActive && (
        <div className="absolute bottom-8 left-0 right-0 flex animate-bounce justify-center">
          <div className="flex flex-col items-center gap-1 text-gray-500">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span className="text-xs">Swipe for more</span>
          </div>
        </div>
      )}
    </div>
  );
}
