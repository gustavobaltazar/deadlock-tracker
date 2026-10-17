"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fill } from "@/lib/i18n";
import { useI18n } from "../I18nProvider";

/** Mesmas chaves do TowerGame: o card mostra a escalada em andamento e o recorde. */
const RUN_KEY = "torre:v1:run";
const BEST_KEY = "torre:v1:best";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Chamada da Torre na home, ao lado do Deadlockdle. Vermelha, como o botão
 * do cabeçalho, para não se confundir com o dourado do jogo diário.
 */
export default function TowerTeaser() {
  const { locale, t } = useI18n();
  const [floor, setFloor] = useState<number | null>(null);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const saved = read<{ run: { floor: number } }>(RUN_KEY);
    setFloor(saved ? saved.run.floor + 1 : null);
    setBest(read<number>(BEST_KEY) ?? 0);
  }, []);

  return (
    <Link
      href={`/${locale}/tower`}
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-xl border-2 border-loss/50 bg-surface/85 p-5 text-left shadow-[0_0_40px_-14px_rgba(255,90,70,0.5)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-loss hover:shadow-[0_0_48px_-10px_rgba(255,90,70,0.65)]"
    >
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 85% 100%, rgba(255,90,70,0.2), transparent 55%), linear-gradient(100deg, rgba(16,19,13,0.6), transparent 70%)",
        }}
      />

      {/* A torre: andares empilhados que afinam para o topo, como na tela do jogo. */}
      <span
        className="pointer-events-none absolute bottom-0 right-4 flex w-20 flex-col-reverse items-center opacity-60 transition-transform duration-300 group-hover:-translate-y-1"
        aria-hidden="true"
      >
        {Array.from({ length: 9 }, (_, i) => (
          <span
            key={i}
            className="mb-1 h-2.5 rounded-sm bg-loss"
            style={{ width: `${100 - i * 9}%`, opacity: 0.35 + i * 0.07 }}
          />
        ))}
        <span className="mb-1 text-xl drop-shadow-[0_0_10px_rgba(255,90,70,0.9)]">⚔</span>
      </span>

      <span className="relative inline-flex w-fit items-center gap-1.5 rounded-full border border-loss/50 bg-loss/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#ff8a7e]">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-loss opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-loss" />
        </span>
        {t.tower.teaser.badge}
      </span>

      <span className="relative mt-2 block text-3xl font-black italic tracking-tight text-souls drop-shadow-[0_0_14px_rgba(255,237,121,0.35)]">
        {t.tower.title}
      </span>
      <span className="relative mt-1 block pr-16 text-sm text-eggshell">{t.tower.teaser.desc}</span>

      <span className="relative mt-3 flex flex-wrap gap-2 pr-16">
        {t.tower.teaser.chips.map((chip) => (
          <span
            key={chip}
            className="rounded-md border border-border bg-bg/70 px-2 py-1 text-xs font-semibold text-ink"
          >
            {chip}
          </span>
        ))}
      </span>

      <span className="relative mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 pr-20">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-loss px-4 py-2 text-sm font-extrabold text-bg transition-colors group-hover:bg-[#ff8a7e]">
          {floor ? fill(t.tower.teaser.resume, { n: floor }) : t.tower.teaser.cta}
          <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
            →
          </span>
        </span>
        {best > 0 && (
          <span className="text-xs text-muted">
            {best > 13 ? t.tower.bestWin : fill(t.tower.best, { n: best })}
          </span>
        )}
      </span>
    </Link>
  );
}
