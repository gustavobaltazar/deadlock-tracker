import { NextResponse } from "next/server";
import {
  errorCode,
  getHeroMap,
  getItemMap,
  getMatchHistory,
  getMatchItems,
  parseAccountId,
  toMatchViews,
} from "@/lib/api";
import { cdnCache, NO_STORE } from "@/lib/http";

const MAX_LIMIT = 50;
/** Nenhum histórico real chega perto disso; acima é parâmetro forjado. */
const MAX_OFFSET = 100_000;

/** Inteiro dentro da faixa, ou o padrão se vier ausente ou inválido. */
function intParam(raw: string | null, fallback: number, min: number, max: number) {
  if (raw == null || !/^\d{1,6}$/.test(raw)) return fallback;
  return Math.min(max, Math.max(min, Number(raw)));
}

/**
 * Página do histórico de partidas. O histórico completo da API chega a milhares
 * de entradas (~770 KB), então o cliente busca em blocos sob demanda.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const accountId = parseAccountId(params.get("account_id"));
  const offset = intParam(params.get("offset"), 0, 0, MAX_OFFSET);
  const limit = intParam(params.get("limit"), 20, 1, MAX_LIMIT);

  if (accountId == null) {
    return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const [matches, heroes, itemCatalog] = await Promise.all([
      getMatchHistory(accountId),
      getHeroMap(),
      getItemMap(),
    ]);
    const slice = matches.slice(offset, offset + limit);
    const builds = await getMatchItems(
      accountId,
      slice.map((m) => m.match_id),
      itemCatalog,
    );
    return NextResponse.json(
      {
        matches: toMatchViews(slice, heroes, builds),
        total: matches.length,
        hasMore: offset + limit < matches.length,
      },
      // Mesmo prazo do cache do histórico em lib/api.
      { headers: cdnCache(120) },
    );
  } catch (error) {
    console.error("[api/matches]", error);
    return NextResponse.json(
      { error: errorCode(error) },
      { status: 502, headers: NO_STORE },
    );
  }
}
