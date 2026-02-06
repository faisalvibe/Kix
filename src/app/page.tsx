import { getPublishedGames } from "@/lib/db";
import GameFeed from "@/components/GameFeed";

export const dynamic = "force-dynamic";

export default function Home() {
  const games = getPublishedGames();
  return <GameFeed games={games} />;
}
