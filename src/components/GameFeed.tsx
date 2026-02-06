"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/types";
import { trackEvent } from "@/lib/session";
import GameCard from "./GameCard";

interface GameFeedProps {
  games: Game[];
}

export default function GameFeed({ games }: GameFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const isAnimating = useRef(false);
  const router = useRouter();

  const goTo = useCallback(
    (index: number) => {
      if (isAnimating.current) return;
      if (index < 0 || index >= games.length) return;
      isAnimating.current = true;
      setCurrentIndex(index);
      setTimeout(() => {
        isAnimating.current = false;
      }, 400);
    },
    [games.length]
  );

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  // Touch handling
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaY.current = touchStartY.current - e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(() => {
    const threshold = 50;
    if (touchDeltaY.current > threshold) goNext();
    else if (touchDeltaY.current < -threshold) goPrev();
    touchDeltaY.current = 0;
  }, [goNext, goPrev]);

  // Mouse wheel handling
  const wheelTimeout = useRef<NodeJS.Timeout | null>(null);
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (wheelTimeout.current) return;
      wheelTimeout.current = setTimeout(() => {
        wheelTimeout.current = null;
      }, 500);

      if (e.deltaY > 30) goNext();
      else if (e.deltaY < -30) goPrev();
    },
    [goNext, goPrev]
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") goNext();
      if (e.key === "ArrowUp" || e.key === "k") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  const handlePlay = useCallback(
    (game: Game) => {
      trackEvent("game_opened", game.id);
      router.push(`/play/${game.slug}`);
    },
    [router]
  );

  if (games.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl font-semibold">No games yet</p>
          <p className="mt-2 text-gray-400">Check back soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-dvh w-full overflow-hidden bg-black"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      {/* Feed container */}
      <div
        className="transition-transform duration-400 ease-out"
        style={{
          transform: `translateY(-${currentIndex * 100}dvh)`,
        }}
      >
        {games.map((game, index) => (
          <div key={game.id} className="h-dvh w-full">
            <GameCard
              game={game}
              isActive={index === currentIndex}
              onPlay={handlePlay}
            />
          </div>
        ))}
      </div>

      {/* Progress dots */}
      {games.length > 1 && (
        <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
          {games.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={`h-2 w-2 rounded-full transition-all ${
                index === currentIndex
                  ? "scale-125 bg-white"
                  : "bg-white/30"
              }`}
            />
          ))}
        </div>
      )}

      {/* Kix branding */}
      <div className="absolute left-4 top-4 z-20">
        <h1 className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-2xl font-extrabold text-transparent">
          KiX
        </h1>
      </div>
    </div>
  );
}
