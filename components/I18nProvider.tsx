"use client";

import { createContext, useContext } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";

/**
 * Disponibiliza o dicionário aos Client Components.
 *
 * Server Components chamam `getDictionary` direto; só os componentes
 * interativos precisam deste contexto, e o dicionário é pequeno o bastante
 * para viajar junto do HTML sem custo relevante.
 */
const I18nContext = createContext<{ locale: Locale; t: Dictionary } | null>(
  null,
);

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, t: dictionary }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n precisa estar dentro de I18nProvider");
  return ctx;
}
