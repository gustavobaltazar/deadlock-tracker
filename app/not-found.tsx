import Link from "next/link";
import "./globals.css";

/**
 * 404 de raiz, para caminhos que nem chegam a ter idioma. As páginas dentro de
 * `/[locale]` usam o not-found traduzido. Como o layout raiz não renderiza
 * <html>, esta página precisa fazê-lo.
 */
export default function NotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-sm text-muted">
          This page does not exist. Try starting from the home page.
        </p>
        <Link
          href="/en"
          className="rounded-md border border-border bg-surface-2 px-4 py-2 text-sm font-semibold hover:border-accent"
        >
          SEARCH<span className="text-accent">LOCK</span>
        </Link>
      </body>
    </html>
  );
}
