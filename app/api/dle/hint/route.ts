import { NextResponse } from "next/server";
import { isPlayableDay } from "@/lib/dle";
import { voiceOfDay } from "@/lib/dle-voice";
import { cdnCache, NO_STORE } from "@/lib/http";

/**
 * Dica em texto do modo Voz: o resumo oficial do papel do herói do dia
 * ("Sneaks in and sprays bullets"). Fica numa rota própria para só chegar ao
 * navegador quando a pessoa desbloqueia a dica.
 */
export async function GET(request: Request) {
  const day = new URL(request.url).searchParams.get("day") ?? "";
  if (!isPlayableDay(day)) {
    return NextResponse.json({ error: "stale_day" }, { status: 409, headers: NO_STORE });
  }
  try {
    const { hero } = await voiceOfDay(day);
    return NextResponse.json(
      { blurb: hero.traits.blurb || null },
      { headers: cdnCache(3600, 3600) },
    );
  } catch (error) {
    console.error("[api/dle/hint]", error);
    return NextResponse.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }
}
