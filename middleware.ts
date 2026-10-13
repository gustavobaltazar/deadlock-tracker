import { NextResponse, type NextRequest } from "next/server";
import { detectLocale, isLocale } from "@/lib/i18n";

/**
 * Garante que toda página tenha o idioma no caminho.
 *
 * Quem chega em `/` ou num link antigo sem idioma (`/player/123`) é levado para
 * a versão correspondente: a escolha salva em cookie tem prioridade e, na
 * primeira visita, vale o idioma do navegador.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  // Fora: rotas de API, assets do Next e arquivos com extensão (robots.txt etc).
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
