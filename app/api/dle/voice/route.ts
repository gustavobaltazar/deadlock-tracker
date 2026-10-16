import { NextResponse } from "next/server";
import { isPlayableDay } from "@/lib/dle";
import { VOICE_CLIPS, voiceOfDay } from "@/lib/dle-voice";
import { NO_STORE } from "@/lib/http";

/**
 * Áudio de uma fala do modo Voz.
 *
 * O arquivo passa por aqui em vez de o navegador baixá-lo direto do bucket da
 * API porque o caminho original entrega a resposta: ele tem o nome interno do
 * herói (`/vo/haze/haze_happy_03.mp3`). Pela rota, o navegador só vê
 * `?day=…&clip=0`.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const day = params.get("day") ?? "";
  const clip = Number(params.get("clip"));

  if (!isPlayableDay(day) || !Number.isInteger(clip) || clip < 0 || clip >= VOICE_CLIPS) {
    return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const { clips } = await voiceOfDay(day);
    const url = clips[clip];
    if (!url) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok || !res.body) throw new Error(`áudio ${res.status}`);

    return new NextResponse(res.body, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "audio/mpeg",
        // O dia está na URL e a fala do dia não muda: a CDN guarda até a virada.
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("[api/dle/voice]", error);
    return NextResponse.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }
}
