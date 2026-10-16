import { NextResponse } from "next/server";
import { errorCode } from "@/lib/api";
import { compareHeroes, dleDay, getDlePool, heroOfDay } from "@/lib/dle";
import { cdnCache, NO_STORE } from "@/lib/http";

/**
 * Confere um palpite do Deadlockdle contra o herói do dia.
 *
 * O dia vem na URL, e não só do relógio do servidor, para a resposta poder
 * ficar na CDN: a mesma combinação dia + herói dá sempre a mesma linha. Só o
 * dia corrente é aceito — o cliente recarrega o jogo quando a data vira.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const day = params.get("day") ?? "";
  const heroId = Number(params.get("hero"));

  if (day !== dleDay()) {
    return NextResponse.json({ error: "stale_day" }, { status: 409, headers: NO_STORE });
  }

  try {
    const pool = await getDlePool();
    const guess = pool.find((h) => h.id === heroId);
    if (!guess) {
      return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
    }
    const row = compareHeroes(guess, heroOfDay(pool, day));
    return NextResponse.json({ row }, { headers: cdnCache(3600, 3600) });
  } catch (error) {
    console.error("[api/dle]", error);
    return NextResponse.json(
      { error: errorCode(error) },
      { status: 502, headers: NO_STORE },
    );
  }
}
