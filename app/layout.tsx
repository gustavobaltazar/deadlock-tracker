import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

/**
 * URL pública do site. Em produção na Vercel vem do ambiente automaticamente;
 * defina NEXT_PUBLIC_SITE_URL para um domínio próprio.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const description =
  "Estatísticas, histórico de partidas, builds e rank de jogadores de Deadlock.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Deadlock Tracker",
    template: "%s · Deadlock Tracker",
  },
  description,
  openGraph: {
    title: "Deadlock Tracker",
    description,
    type: "website",
    locale: "pt_BR",
  },
  twitter: { card: "summary", title: "Deadlock Tracker", description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      {/* Coluna flex com o conteúdo em flex-1: em páginas curtas, como a home,
          isso empurra o rodapé para a base da janela em vez de deixá-lo solto
          logo abaixo do conteúdo. */}
      <body className="flex min-h-screen flex-col">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex h-14 max-w-[1100px] items-center px-4">
            <Link href="/" className="text-lg font-extrabold tracking-tight">
              DEADLOCK<span className="text-accent">.TRACKER</span>
            </Link>
          </div>
        </header>
        <div className="flex-1">{children}</div>

        <footer className="mt-10 border-t border-border px-4 py-5 text-center text-xs text-muted">
          Dados fornecidos pela{" "}
          <a
            href="https://deadlock-api.com"
            className="underline hover:text-ink"
            target="_blank"
            rel="noreferrer"
          >
            Deadlock API
          </a>
          . Projeto não oficial, sem vínculo com a Valve.
        </footer>
      </body>
    </html>
  );
}
