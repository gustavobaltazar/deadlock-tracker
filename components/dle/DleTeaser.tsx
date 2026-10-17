"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "../I18nProvider";
import ModeIcon from "./ModeIcon";
import { Countdown, readProgress, DLE_MODES as MODES, type DleMode, type GuessBase } from "./shared";

/**
 * Chamada do Deadlockdle na home, logo abaixo da busca.
 *
 * As silhuetas são retratos de heróis pintados de preto com contorno dourado:
 * o "quem é esse herói?" do jogo, sem entregar nada. Os heróis são fixos e
 * escolhidos pela silhueta reconhecível, não o herói do dia.
 */
export default function DleTeaser({ silhouettes }: { silhouettes: string[] }) {
  const { locale, t } = useI18n();
  const [solved, setSolved] = useState<Set<DleMode> | null>(null);

  useEffect(() => {
    const day = new Date().toISOString().slice(0, 10);
    setSolved(
      new Set(MODES.filter((m) => readProgress<GuessBase>(m, day).some((r) => r.correct))),
    );
  }, []);

  const allDone = solved?.size === MODES.length;

  return (
    <Link
      href={`/${locale}/deadlockdle`}
      className="group relative block h-full w-full overflow-hidden rounded-xl border-2 border-accent-dim/50 bg-surface/85 text-left shadow-[0_0_40px_-14px_rgba(255,237,121,0.45)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_0_48px_-10px_rgba(255,237,121,0.6)]"
    >
      {/* Brilho dourado vindo da direita, atrás das silhuetas. */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 88% 55%, rgba(255,237,121,0.16), transparent 50%), linear-gradient(100deg, rgba(16,19,13,0.6), transparent 60%)",
        }}
      />

      {/* Silhuetas: escondidas no celular, onde disputariam espaço com o texto. */}
      <span className="pointer-events-none absolute inset-y-0 right-0 hidden w-[36%] items-end justify-end pr-2 sm:flex"
        style={{
          // Esmaece a borda esquerda: as silhuetas nascem do fundo, sem cortar o texto.
          maskImage: "linear-gradient(to right, transparent, black 30%)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 30%)",
        }}
      >
        {silhouettes.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            className="h-[82%] w-auto object-contain transition-transform duration-300 group-hover:-translate-y-1"
            style={{
              marginLeft: i === 0 ? 0 : "-28%",
              filter:
                "brightness(0) drop-shadow(0 0 1px rgba(255,237,121,0.9)) drop-shadow(0 0 8px rgba(255,237,121,0.35))",
              opacity: i === silhouettes.length - 1 ? 1 : 0.7,
              zIndex: i,
              transform: i === silhouettes.length - 1 ? "scale(1.08)" : undefined,
            }}
          />
        ))}
        <span
          className="absolute right-[30%] top-2 text-5xl font-black text-souls drop-shadow-[0_0_12px_rgba(255,237,121,0.7)] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
          aria-hidden="true"
        >
          ?
        </span>
      </span>

      <span className="relative block p-5 sm:max-w-[64%]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-souls/40 bg-souls/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-souls">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-souls opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-souls" />
          </span>
          {t.dle.teaser.badge}
        </span>

        <span className="mt-2 block text-3xl font-extrabold tracking-tight">
          <span className="text-muted">DEADLOCK</span>
          <span className="text-accent">DLE</span>
        </span>
        <span className="mt-1 block text-sm text-eggshell">{t.dle.teaser.desc}</span>

        {/* Modos, com o andamento de hoje. */}
        <span className="mt-3 flex flex-wrap gap-2">
          {MODES.map((mode) => {
            const done = solved?.has(mode);
            return (
              <span
                key={mode}
                className={
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold " +
                  (done
                    ? "border-win/50 bg-win/10 text-win"
                    : "border-border bg-bg/70 text-ink")
                }
              >
                <ModeIcon mode={mode} className="size-3.5" />
                {t.dle.modes[mode].title}
                {done && <span aria-hidden="true">✓</span>}
              </span>
            );
          })}
        </span>

        <span className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-extrabold text-bg transition-colors group-hover:bg-souls">
            {allDone ? t.dle.teaser.seeResults : t.dle.teaser.cta}
            <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
              →
            </span>
          </span>
          <Countdown label={t.dle.hub.newHeroes} className="text-xs text-muted" />
        </span>
      </span>
    </Link>
  );
}
