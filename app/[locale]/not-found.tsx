"use client";

import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";
import SearchBar from "@/components/SearchBar";

/**
 * Client Component porque `not-found.tsx` não recebe os params da rota — o
 * idioma vem do contexto montado no layout.
 */
export default function LocaleNotFound() {
  const { locale, t } = useI18n();

  return (
    <main className="mx-auto max-w-[560px] px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">{t.errors.notFoundTitle}</h1>
      <p className="mt-2 text-sm text-muted">{t.errors.notFoundBody}</p>
      <div className="mt-6">
        <SearchBar />
      </div>
      <Link
        href={`/${locale}`}
        className="mt-6 inline-block text-xs text-accent hover:underline"
      >
        {t.errors.backHome}
      </Link>
    </main>
  );
}
