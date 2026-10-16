import { NextResponse } from "next/server";
import { isPlayableDay } from "@/lib/dle";
import { EMOJI_COUNT, emojiOfDay } from "@/lib/dle-emoji";
import { cdnCache, NO_STORE } from "@/lib/http";

/**
 * Emojis do modo Emojis, só até o `n` pedido. Ficam numa rota própria, e não na
 * página, para o navegador nunca ter os cinco antes da hora: o último deles
 * praticamente entrega o herói.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const day = params.get("day") ?? "";
  const n = Number(params.get("n"));

  if (!isPlayableDay(day)) {
    return NextResponse.json({ error: "stale_day" }, { status: 409, headers: NO_STORE });
  }
  if (!Number.isInteger(n) || n < 1 || n > EMOJI_COUNT) {
    return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const { emojis } = await emojiOfDay(day);
    return NextResponse.json({ emojis: emojis.slice(0, n) }, { headers: cdnCache(3600, 3600) });
  } catch (error) {
    console.error("[api/dle/emoji]", error);
    return NextResponse.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }
}
