import { NextResponse } from "next/server";
import { searchPlayers } from "@/lib/api";

/**
 * Proxy do /v1/players/steam-search. Existe para evitar CORS no browser
 * e para não enviar o campo `friends` (centenas de KB) ao cliente.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const profiles = await searchPlayers(query, 25);
    return NextResponse.json({
      results: profiles.map((p) => ({
        account_id: p.account_id,
        personaname: p.personaname,
        avatar: p.avatarmedium ?? p.avatar,
        matches_played_last_30d: p.matches_played_last_30d,
        countrycode: p.countrycode,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ results: [], error: message }, { status: 502 });
  }
}
