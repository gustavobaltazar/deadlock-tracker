import { NextResponse } from "next/server";
import { searchPlayers } from "@/lib/api";
import { parseSteamInput, resolveVanity } from "@/lib/steam";

type Hit = {
  account_id: number;
  personaname: string | null;
  avatar: string | null;
  matches_played_last_30d: number | null;
  countrycode: string | null;
};

/**
 * Busca de jogadores. Aceita nome, account_id, SteamID64, SteamID3 e URL de
 * perfil Steam (numérica ou com vanity).
 *
 * Existe como route handler para evitar CORS no browser e para descartar o
 * campo `friends` da resposta da API, que sozinho pesa centenas de KB.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const parsed = parseSteamInput(query);

    // Texto livre: busca normal por nome.
    if (parsed.kind === "text") {
      const profiles = await searchPlayers(parsed.text, 25);
      return NextResponse.json({ results: profiles.map(toHit) });
    }

    const accountId =
      parsed.kind === "accountId"
        ? parsed.accountId
        : await resolveVanity(parsed.vanity);

    if (accountId == null) {
      return NextResponse.json({
        results: [],
        error: "Não foi possível resolver essa URL da Steam.",
      });
    }

    // Jogador identificado: devolvemos só ele, marcado como exato, para o
    // cliente poder navegar direto no Enter.
    const profiles = await searchPlayers(String(accountId), 1);
    const hit = profiles.find((p) => p.account_id === accountId);
    return NextResponse.json({
      exact: accountId,
      results: hit ? [toHit(hit)] : [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ results: [], error: message }, { status: 502 });
  }
}

function toHit(p: {
  account_id: number;
  personaname: string | null;
  avatar: string | null;
  avatarmedium: string | null;
  matches_played_last_30d: number | null;
  countrycode: string | null;
}): Hit {
  return {
    account_id: p.account_id,
    personaname: p.personaname,
    avatar: p.avatarmedium ?? p.avatar,
    matches_played_last_30d: p.matches_played_last_30d,
    countrycode: p.countrycode,
  };
}
