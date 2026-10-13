import { NextResponse } from "next/server";
import {
  analyzeBuild,
  getHeroMap,
  getItemMap,
  getMatchDetail,
} from "@/lib/api";

/**
 * Detalhe de uma partida: os 12 jogadores com suas builds e, quando há um
 * `account_id`, a análise da build desse jogador contra o adversário de lane.
 * Carregado sob demanda ao expandir a partida — nunca no load da página.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;
  const id = Number(matchId);
  const accountId = Number(new URL(request.url).searchParams.get("account_id"));

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "match_id inválido" }, { status: 400 });
  }

  try {
    const [heroes, items] = await Promise.all([getHeroMap(), getItemMap()]);
    const detail = await getMatchDetail(id, heroes, items);
    if (!detail) {
      return NextResponse.json(
        { error: "Partida não encontrada na base da API." },
        { status: 404 },
      );
    }

    const me = Number.isInteger(accountId)
      ? detail.players.find((p) => p.accountId === accountId)
      : undefined;

    let analysis = null;
    if (me) {
      // Adversário de lane: time oposto, mesma lane atribuída.
      const laneEnemies = detail.players.filter(
        (p) => p.team !== me.team && p.lane != null && p.lane === me.lane,
      );
      analysis = await analyzeBuild(
        me.heroId,
        laneEnemies.map((p) => p.heroId),
        laneEnemies.map((p) => p.heroName),
        me.purchased,
        items,
        detail.gameMode,
      );
    }

    return NextResponse.json({ detail, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
