import { NextResponse } from "next/server";
import {
  getHeroMap,
  getItemMap,
  getMatchHistory,
  getMatchItems,
  toMatchViews,
} from "@/lib/api";

const MAX_LIMIT = 50;

/**
 * Página do histórico de partidas. O histórico completo da API chega a milhares
 * de entradas (~770 KB), então o cliente busca em blocos sob demanda.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const accountId = Number(params.get("account_id"));
  const offset = Math.max(0, Number(params.get("offset") ?? 0));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(params.get("limit") ?? 20)));

  if (!Number.isInteger(accountId) || accountId <= 0) {
    return NextResponse.json({ error: "account_id inválido" }, { status: 400 });
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
    return NextResponse.json({
      matches: toMatchViews(slice, heroes, builds),
      total: matches.length,
      hasMore: offset + limit < matches.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
