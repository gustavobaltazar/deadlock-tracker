import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deadlock Tracker",
  description: "Estatísticas, histórico de partidas e rank de jogadores de Deadlock.",
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
