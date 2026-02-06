"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/types";
import { getSessionId, trackEvent } from "@/lib/session";

interface GamePlayerProps {
  game: Game;
}

export default function GamePlayer({ game }: GamePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "no-sdk" | "error">("loading");
  const router = useRouter();
  const isLandscape = game.orientation === "landscape";

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data?.type) return;
      switch (e.data.type) {
        case "kix:ready":
          setStatus("ready");
          trackEvent("game_started", game.id);
          // Send start command
          iframeRef.current?.contentWindow?.postMessage({ type: "kix:start" }, "*");
          break;
        case "kix:no-sdk":
          setStatus("no-sdk");
          // Game still works, just no SDK lifecycle
          trackEvent("game_started", game.id, { sdk: false });
          break;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [game.id]);

  // Timeout for load errors
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (status === "loading") {
        setStatus("error");
        trackEvent("load_error", game.id, { reason: "timeout" });
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [status, game.id]);

  const handleBack = useCallback(() => {
    // Destroy game before leaving
    iframeRef.current?.contentWindow?.postMessage({ type: "kix:destroy" }, "*");
    trackEvent("game_exit", game.id);
    router.push("/");
  }, [game.id, router]);

  const iframeSrc = `${game.entry_url}?session_id=${getSessionId()}&game_id=${game.id}`;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="absolute left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-colors hover:bg-black/80"
      >
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Loading overlay */}
      {status === "loading" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-purple-500" />
          <p className="text-sm text-gray-400">Loading {game.title}...</p>
        </div>
      )}

      {/* Error overlay */}
      {status === "error" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black">
          <div className="text-center">
            <p className="text-lg font-semibold text-white">Failed to load game</p>
            <p className="mt-2 text-sm text-gray-400">
              The game took too long to respond.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setStatus("loading");
                  if (iframeRef.current) iframeRef.current.src = iframeSrc;
                }}
                className="rounded-full bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Retry
              </button>
              <button
                onClick={handleBack}
                className="rounded-full bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/20"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game iframe */}
      <div className={`h-full w-full ${isLandscape ? "landscape-container" : ""}`}>
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className={`h-full w-full border-0 ${isLandscape ? "landscape-game" : ""}`}
          sandbox="allow-scripts allow-same-origin allow-popups"
          allow="autoplay; fullscreen"
          title={game.title}
          onLoad={() => {
            // If no SDK message after 3s, assume no SDK but game works
            setTimeout(() => {
              if (status === "loading") setStatus("no-sdk");
            }, 3000);
          }}
        />
      </div>
    </div>
  );
}
