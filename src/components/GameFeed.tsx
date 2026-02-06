"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Game } from "@/lib/types";
import { getSessionId, trackEvent } from "@/lib/session";

export default function GameFeed() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState<Record<string, boolean>>({});
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const isAnimating = useRef(false);
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  // Fetch games from API client-side (avoids SSR caching issues)
  useEffect(() => {
    fetch("/api/v1/games")
      .then((res) => res.json())
      .then((data) => setGames(data.games ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentGame = games[currentIndex];
  const isPlaying = playingId === currentGame?.id;

  const goTo = useCallback(
    (index: number) => {
      if (isAnimating.current) return;
      if (index < 0 || index >= games.length) return;

      // Stop current game if playing
      if (playingId) {
        const iframe = iframeRefs.current[playingId];
        iframe?.contentWindow?.postMessage({ type: "kix:pause" }, "*");
        setPlayingId(null);
      }

      isAnimating.current = true;
      setCurrentIndex(index);
      trackEvent("game_card_viewed", games[index].id);
      setTimeout(() => {
        isAnimating.current = false;
      }, 350);
    },
    [games, playingId]
  );

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  // Touch handling - only when NOT playing
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isPlaying) return;
      touchStartY.current = e.touches[0].clientY;
      touchDeltaY.current = 0;
    },
    [isPlaying]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isPlaying) return;
      touchDeltaY.current = touchStartY.current - e.touches[0].clientY;
    },
    [isPlaying]
  );

  const onTouchEnd = useCallback(() => {
    if (isPlaying) return;
    const threshold = 50;
    if (touchDeltaY.current > threshold) goNext();
    else if (touchDeltaY.current < -threshold) goPrev();
    touchDeltaY.current = 0;
  }, [isPlaying, goNext, goPrev]);

  // Mouse wheel
  const wheelTimeout = useRef<NodeJS.Timeout | null>(null);
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (isPlaying) return;
      if (wheelTimeout.current) return;
      wheelTimeout.current = setTimeout(() => {
        wheelTimeout.current = null;
      }, 400);
      if (e.deltaY > 30) goNext();
      else if (e.deltaY < -30) goPrev();
    },
    [isPlaying, goNext, goPrev]
  );

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPlaying) {
        setPlayingId(null);
        return;
      }
      if (isPlaying) return;
      if (e.key === "ArrowDown" || e.key === "j") goNext();
      if (e.key === "ArrowUp" || e.key === "k") goPrev();
      if (e.key === "Enter" && currentGame) handlePlay();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, isPlaying, currentGame]);

  const handlePlay = useCallback(() => {
    if (!currentGame) return;
    trackEvent("game_opened", currentGame.id);
    setPlayingId(currentGame.id);

    // If iframe already loaded, send start
    const iframe = iframeRefs.current[currentGame.id];
    if (iframe) {
      iframe.contentWindow?.postMessage({ type: "kix:start" }, "*");
    }
  }, [currentGame]);

  const handleClose = useCallback(() => {
    if (!playingId) return;
    const iframe = iframeRefs.current[playingId];
    iframe?.contentWindow?.postMessage({ type: "kix:pause" }, "*");
    trackEvent("game_exit", playingId);
    setPlayingId(null);
  }, [playingId]);

  // Track first game view
  useEffect(() => {
    if (games.length > 0) {
      trackEvent("game_card_viewed", games[0].id);
    }
  }, [games]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-purple-500" />
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black text-white">
        <p className="text-lg text-gray-400">No games yet</p>
      </div>
    );
  }

  return (
    <div
      className="relative h-dvh w-full overflow-hidden bg-black"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      {/* Sliding container */}
      <div
        className="h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateY(-${currentIndex * 100}dvh)` }}
      >
        {games.map((game, index) => {
          const isActive = index === currentIndex;
          const isThisPlaying = playingId === game.id;
          const sessionId = typeof window !== "undefined" ? getSessionId() : "";
          const iframeSrc = `${game.entry_url}?session_id=${sessionId}&game_id=${game.id}`;

          return (
            <div key={game.id} className="relative h-dvh w-full">
              {/* Game iframe - always present for active card, preloaded */}
              {(isActive || isThisPlaying) && (
                <iframe
                  ref={(el) => { iframeRefs.current[game.id] = el; }}
                  src={iframeSrc}
                  className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${
                    isThisPlaying ? "z-30 opacity-100" : "z-0 opacity-0"
                  }`}
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  allow="autoplay; fullscreen"
                  title={game.title}
                  onLoad={() => {
                    setIframeLoaded((prev) => ({ ...prev, [game.id]: true }));
                    trackEvent("game_started", game.id, { sdk: false });
                  }}
                />
              )}

              {/* Card overlay - shows when NOT playing this game */}
              <div
                className={`absolute inset-0 z-20 flex flex-col transition-opacity duration-300 ${
                  isThisPlaying ? "pointer-events-none opacity-0" : "opacity-100"
                }`}
              >
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-gray-900/90 via-black/70 to-black" />

                {/* Thumbnail as background */}
                {game.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={game.thumbnail_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-20 blur-2xl"
                  />
                )}

                {/* Content */}
                <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8">
                  {/* Thumbnail */}
                  <div className="mb-6 h-40 w-40 overflow-hidden rounded-3xl shadow-2xl shadow-purple-500/30">
                    {game.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={game.thumbnail_url} alt={game.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
                        <span className="text-5xl font-bold text-white">{game.title.charAt(0)}</span>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="mb-2 text-2xl font-bold text-white">{game.title}</h2>
                  <p className="mb-4 max-w-xs text-center text-sm leading-relaxed text-gray-400">
                    {game.description}
                  </p>

                  {/* Tags */}
                  <div className="mb-6 flex flex-wrap justify-center gap-2">
                    {game.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Big play button */}
                  <button
                    onClick={handlePlay}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-xl shadow-purple-500/40 transition-transform hover:scale-105 active:scale-95"
                  >
                    <svg className="ml-1 h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>

                {/* Bottom swipe hint */}
                {isActive && !isThisPlaying && index < games.length - 1 && (
                  <div className="relative z-10 flex animate-bounce justify-center pb-8">
                    <div className="flex flex-col items-center gap-1 text-gray-500">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      <span className="text-xs">Swipe up for next</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Close button when playing */}
              {isThisPlaying && (
                <button
                  onClick={handleClose}
                  className="absolute left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 backdrop-blur-sm"
                >
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* KiX branding */}
      {!isPlaying && (
        <div className="absolute left-4 top-4 z-40">
          <h1 className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-2xl font-extrabold text-transparent">
            KiX
          </h1>
        </div>
      )}

      {/* Progress dots */}
      {!isPlaying && games.length > 1 && (
        <div className="absolute right-3 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-2">
          {games.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={`h-2 w-2 rounded-full transition-all ${
                index === currentIndex ? "scale-125 bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
