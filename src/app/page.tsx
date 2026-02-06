import { getPublishedGames } from "@/lib/db";
import GameFeed from "@/components/GameFeed";

export const dynamic = "force-dynamic";

export default async function Home() {
  const games = await getPublishedGames();
  return <GameFeed games={games} />;
}
