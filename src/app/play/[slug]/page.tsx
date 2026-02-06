import { notFound } from "next/navigation";
import { getGameBySlug } from "@/lib/db";
import GamePlayer from "@/components/GamePlayer";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PlayPage({ params }: Props) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game || game.status !== "published") {
    notFound();
  }

  return <GamePlayer game={game} />;
}
