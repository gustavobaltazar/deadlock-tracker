"use client";

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "./I18nProvider";
import { locales, localeNames } from "@/lib/i18n";

/**
 * Troca o idioma mantendo a página atual: só o primeiro segmento do caminho
 * muda (/pt/player/123 -> /en/player/123).
 *
 * A escolha é gravada num cookie para que visitas futuras à raiz já caiam no
 * idioma certo, em vez de voltar à detecção pelo navegador.
 */
export default function LanguageSwitch() {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: string) {
    if (next === locale) return;
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;

    const segments = pathname.split("/");
    segments[1] = next; // o primeiro segmento é sempre o idioma
    router.push(segments.join("/") || `/${next}`);
    router.refresh();
  }

  return (
    <div
      className="flex items-center gap-1 rounded-md border border-border bg-bg/60 p-0.5"
      role="group"
      aria-label={t.language}
    >
      {locales.map((code) => (
        <button
          key={code}
          onClick={() => switchTo(code)}
          aria-current={code === locale}
          title={localeNames[code]}
          className={
            "rounded px-2 py-1 text-xs font-bold uppercase transition-colors " +
            (code === locale
              ? "bg-accent/15 text-accent"
              : "text-muted hover:text-ink")
          }
        >
          {code}
        </button>
      ))}
    </div>
  );
}
