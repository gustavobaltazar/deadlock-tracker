import { NextResponse } from "next/server";
import { isPlayableDay } from "@/lib/dle";
import { abilityOfDay } from "@/lib/dle-ability";
import { cdnCache, NO_STORE } from "@/lib/http";

/**
 * Rodada bônus do modo Habilidade: depois de acertar o herói, a pessoa escolhe
 * qual das quatro habilidades dele é a do ícone. A resposta fica aqui, e não
 * junto do palpite certo, para não aparecer no navegador antes da escolha.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const day = params.get("day") ?? "";
  const pick = Number(params.get("pick"));

  if (!isPlayableDay(day)) {
    return NextResponse.json({ error: "stale_day" }, { status: 409, headers: NO_STORE });
  }
  if (!Number.isInteger(pick) || pick < 0 || pick > 3) {
    return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const { slot } = await abilityOfDay(day);
    return NextResponse.json(
      { correct: pick === slot, answer: slot },
      { headers: cdnCache(3600, 3600) },
    );
  } catch (error) {
    console.error("[api/dle/ability]", error);
    return NextResponse.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }
}
