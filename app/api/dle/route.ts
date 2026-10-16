import { NextResponse } from "next/server";
import { errorCode } from "@/lib/api";
import { compareHeroes, getDlePool, heroOfDay, isPlayableDay } from "@/lib/dle";
import { abilityOfDay } from "@/lib/dle-ability";
import { emojiOfDay } from "@/lib/dle-emoji";
import { voiceOfDay } from "@/lib/dle-voice";
import { cdnCache, NO_STORE } from "@/lib/http";

/**
 * Confere um palpite do Deadlockdle contra o herói do dia do modo pedido.
 *
 * O dia vem na URL, e não só do relógio do servidor, para a resposta poder
 * ficar na CDN: a mesma combinação modo + dia + herói dá sempre a mesma
 * resposta. Só hoje e ontem são aceitos — o cliente recarrega quando a data vira.
 *
 * - `mode=classic` (padrão): linha com os atributos comparados.
 * - `mode=voice`: só acertou ou não, como no modo Quote do Loldle.
 * - `mode=ability`: acertou ou não; o palpite certo traz os nomes das quatro
 *   habilidades do herói, para a rodada bônus.
 * - `mode=emoji`: só acertou ou não.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const day = params.get("day") ?? "";
  const heroId = Number(params.get("hero"));
  const mode = params.get("mode") ?? "classic";

  if (!isPlayableDay(day)) {
    return NextResponse.json({ error: "stale_day" }, { status: 409, headers: NO_STORE });
  }
  if (!["classic", "voice", "ability", "emoji"].includes(mode)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    if (mode === "voice" || mode === "emoji") {
      const { hero, pool } = await (mode === "voice" ? voiceOfDay(day) : emojiOfDay(day));
      const guess = pool.find((h) => h.id === heroId);
      if (!guess) {
        return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
      }
      const row = {
        heroId: guess.id,
        name: guess.name,
        icon: guess.icon,
        correct: guess.id === hero.id,
      };
      return NextResponse.json({ row }, { headers: cdnCache(3600, 3600) });
    }

    if (mode === "ability") {
      const { hero, pool, abilities } = await abilityOfDay(day);
      const guess = pool.find((h) => h.id === heroId);
      if (!guess) {
        return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
      }
      const correct = guess.id === hero.id;
      const row = {
        heroId: guess.id,
        name: guess.name,
        icon: guess.icon,
        correct,
        ...(correct ? { abilities: abilities.map((a) => a.name) } : {}),
      };
      return NextResponse.json({ row }, { headers: cdnCache(3600, 3600) });
    }

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
