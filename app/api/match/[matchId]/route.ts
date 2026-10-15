import { NextResponse } from "next/server";
import {
  analyzeBuild,
  errorCode,
  getHeroMap,
  getItemMap,
  getMatchDetail,
  parseAccountId,
} from "@/lib/api";
import { cdnCache, NO_STORE } from "@/lib/http";

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
  const id = /^\d{1,12}$/.test(matchId) ? Number(matchId) : 0;
  const rawAccount = new URL(request.url).searchParams.get("account_id");
  const accountId = parseAccountId(rawAccount);

  if (id <= 0 || (rawAccount && accountId == null)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const [heroes, items] = await Promise.all([getHeroMap(), getItemMap()]);
    const detail = await getMatchDetail(id, heroes, items);
    if (!detail) {
      // Pode ser só defasagem de coleta: cache curto, para a partida aparecer
      // assim que a API a indexar.
      return NextResponse.json(
        { error: "not_found" },
        { status: 404, headers: cdnCache(60, 60) },
      );
    }

    const me =
      accountId != null
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

    // Partida encerrada não muda; a referência de builds muda devagar.
    return NextResponse.json({ detail, analysis }, { headers: cdnCache(3600) });
  } catch (error) {
    console.error("[api/match]", error);
    return NextResponse.json(
      { error: errorCode(error) },
      { status: 502, headers: NO_STORE },
    );
  }
}
