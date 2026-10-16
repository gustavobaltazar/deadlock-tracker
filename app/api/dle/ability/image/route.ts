import { NextResponse } from "next/server";
import { dleDay } from "@/lib/dle";
import { ABILITY_STRAIGHT, renderAbility } from "@/lib/dle-ability";
import { NO_STORE } from "@/lib/http";

/**
 * Ícone do modo Habilidade no estágio pedido (0 = close-up, girado; o último =
 * ícone inteiro e desvirado). O recorte sai pronto do servidor para o navegador
 * nunca ter o ícone inteiro, nem a URL original, que traz o nome do herói.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const day = params.get("day") ?? "";
  const stage = Number(params.get("stage"));

  if (day !== dleDay() || !Number.isInteger(stage) || stage < 0 || stage > ABILITY_STRAIGHT) {
    return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const png = await renderAbility(day, stage);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        // O dia está na URL e a imagem do estágio não muda: a CDN guarda até a virada.
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("[api/dle/ability/image]", error);
    return NextResponse.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }
}
