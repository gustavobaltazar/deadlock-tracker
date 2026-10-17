import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { I18nProvider } from "@/components/I18nProvider";
import LanguageSwitch from "@/components/LanguageSwitch";
import LogoMark from "@/components/LogoMark";
import { getDictionary, isLocale, locales, type Locale } from "@/lib/i18n";

/**
 * Fonte do site. next/font baixa e serve os arquivos junto da aplicação, então
 * não há requisição ao Google a cada visita nem salto de layout ao carregar.
 */
const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

/** Gera /en e /pt estaticamente. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * URL pública do site. Em produção na Vercel vem do ambiente automaticamente;
 * defina NEXT_PUBLIC_SITE_URL para um domínio próprio.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);

  return {
    metadataBase: new URL(siteUrl),
    title: { default: "SEARCHLOCK", template: "%s · SEARCHLOCK" },
    description: t.site.description,
    // hreflang: diz aos buscadores que as duas versões são a mesma página em
    // idiomas diferentes, em vez de conteúdo duplicado.
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", "pt-BR": "/pt" },
    },
    openGraph: {
      title: "SEARCHLOCK",
      description: t.site.description,
      type: "website",
      locale: locale === "pt" ? "pt_BR" : "en_US",
    },
    twitter: {
      card: "summary",
      title: "SEARCHLOCK",
      description: t.site.description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = getDictionary(locale as Locale);

  return (
    <html lang={locale === "pt" ? "pt-BR" : "en"} className={quicksand.variable}>
      {/* Coluna flex com o conteúdo em flex-1: em páginas curtas, como a home,
          isso empurra o rodapé para a base da janela em vez de deixá-lo solto
          logo abaixo do conteúdo. */}
      <body className="flex min-h-screen flex-col">
        <I18nProvider locale={locale as Locale} dictionary={dictionary}>
          <header className="border-b border-border bg-surface">
            <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-4 px-4">
              <Link
                href={`/${locale}`}
                className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"
              >
                <LogoMark className="h-7 w-auto text-accent" />
                <span>
                  <span className="text-muted">SEARCH</span>
                  <span className="text-accent">LOCK</span>
                </span>
              </Link>
              <div className="flex items-center gap-3">
                <Link
                  href={`/${locale}/tower`}
                  className="rounded-md border border-loss/50 bg-loss/10 px-3 py-1.5 text-xs font-bold text-[#ff8a7e] transition-colors hover:bg-loss/20"
                >
                  ⚔ {dictionary.tower.nav}
                </Link>
                <Link
                  href={`/${locale}/deadlockdle`}
                  className="flex items-center gap-2 rounded-md border border-souls/40 bg-souls/10 px-3 py-1.5 text-xs font-bold text-souls shadow-[0_0_14px_-4px_rgba(255,237,121,0.5)] transition-colors hover:bg-souls/20"
                >
                  {/* Pontinho pulsando: o jogo diário sempre tem algo novo. */}
                  <span className="relative flex size-2" aria-hidden="true">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-souls opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-souls" />
                  </span>
                  {dictionary.dle.nav}
                </Link>
                <LanguageSwitch />
              </div>
            </div>
          </header>

          <div className="flex-1">{children}</div>

          <footer className="mt-10 border-t border-border px-4 py-5 text-center text-xs text-muted">
            {dictionary.site.footer.dataBy}{" "}
            <a
              href="https://deadlock-api.com"
              className="underline hover:text-ink"
              target="_blank"
              rel="noreferrer"
            >
              Deadlock API
            </a>
            . {dictionary.site.footer.disclaimer}
          </footer>
        </I18nProvider>
        {/* Vercel Web Analytics: só envia dados em produção na Vercel; em
            desenvolvimento o componente não faz nada. */}
        <Analytics />
      </body>
    </html>
  );
}
