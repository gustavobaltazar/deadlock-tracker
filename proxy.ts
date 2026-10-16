import { NextResponse, type NextRequest } from "next/server";
import { detectLocale, isLocale } from "@/lib/i18n";
import { clientIp, hit, type Limit } from "@/lib/rate-limit";

/**
 * Limites por IP, por minuto. Folgados para uso humano — a busca já tem
 * debounce no cliente e ninguém abre 30 partidas por minuto — mas baixos o
 * bastante para um script não esgotar a cota da Deadlock API, que é do
 * servidor inteiro. Valores pensados também para IP compartilhado (lan
 * house, faculdade, CGNAT de operadora).
 */
const LIMITS: { pattern: RegExp; name: string; limit: Limit }[] = [
  { pattern: /^\/api\/search/, name: "search", limit: { max: 60, windowMs: 60_000 } },
  { pattern: /^\/api\/match\//, name: "match", limit: { max: 30, windowMs: 60_000 } },
  { pattern: /^\/api\/matches/, name: "matches", limit: { max: 30, windowMs: 60_000 } },
  // Cada palpite é uma requisição; nada chega à Deadlock API (o elenco fica em
  // memória), então o limite só segura script tentando todos os heróis.
  { pattern: /^\/api\/dle/, name: "dle", limit: { max: 60, windowMs: 60_000 } },
  { pattern: /^\/[a-z]{2}\/player\//, name: "player", limit: { max: 40, windowMs: 60_000 } },
];

/**
 * Duas funções: limita requisições por IP e garante que toda página tenha o
 * idioma no caminho.
 *
 * Quem chega em `/` ou num link antigo sem idioma (`/player/123`) é levado para
 * a versão correspondente: a escolha salva em cookie tem prioridade e, na
 * primeira visita, vale o idioma do navegador.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const regra = LIMITS.find((r) => r.pattern.test(pathname));
  if (regra) {
    const resultado = hit(`${regra.name}:${clientIp(request.headers)}`, regra.limit);
    if (!resultado.ok) {
      const headers = {
        "Retry-After": String(resultado.retryAfter),
        "Cache-Control": "no-store",
      };
      return pathname.startsWith("/api/")
        ? NextResponse.json({ error: "rate_limited" }, { status: 429, headers })
        : new NextResponse(
            "Too many requests. Please wait a minute and try again.\n" +
              "Muitas requisições. Aguarde um minuto e tente de novo.",
            {
              status: 429,
              headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
            },
          );
    }
  }

  if (pathname.startsWith("/api/")) return NextResponse.next();

  const firstSegment = pathname.split("/")[1];
  if (isLocale(firstSegment)) return NextResponse.next();

  const saved = request.cookies.get("locale")?.value;
  const locale =
    saved && isLocale(saved)
      ? saved
      : detectLocale(request.headers.get("accept-language"));

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Fora: assets do Next e arquivos com extensão (robots.txt etc). As rotas de
  // API entram, para o limite por IP.
  matcher: ["/((?!_next/static|_next/image|_vercel|.*\\..*).*)"],
};
