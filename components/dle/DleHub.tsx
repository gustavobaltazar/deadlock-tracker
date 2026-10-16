"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "../I18nProvider";
import ModeIcon from "./ModeIcon";
import {
  Countdown,
  readProgress,
  type DleMode,
  type DleOption,
  type GuessBase,
} from "./shared";
import { fill } from "@/lib/i18n";

type Progress = { tries: number; won: boolean };

/**
 * Menu do Deadlockdle: um cartão por modo, com o andamento de hoje lido do
 * navegador — "resolvido em 4", "3 tentativas até agora" ou só "Jogar".
 */
export default function DleHub({
  day,
  yesterday,
}: {
  day: string;
  yesterday: Record<DleMode, DleOption | null>;
}) {
  const { locale, t } = useI18n();
  const [progress, setProgress] = useState<Partial<Record<DleMode, Progress>>>({});

  useEffect(() => {
    const read = (mode: DleMode): Progress => {
      const rows = readProgress<GuessBase>(mode, day);
      return { tries: rows.length, won: rows.some((r) => r.correct) };
    };
    setProgress({ classic: read("classic"), voice: read("voice"), ability: read("ability") });
  }, [day]);

  const tries = (n: number) => (n === 1 ? t.dle.tryOne : t.dle.tryMany);
  const modes: { mode: DleMode; accent: string }[] = [
    { mode: "classic", accent: "#69e799" },
    { mode: "voice", accent: "#ffed79" },
    { mode: "ability", accent: "#b48cff" },
  ];
  const solvedCount = modes.filter((m) => progress[m.mode]?.won).length;

  return (
    <div className="mx-auto max-w-[560px] space-y-3">
      {modes.map(({ mode, accent }) => {
        const p = progress[mode];
        const status = p?.won
          ? fill(t.dle.hub.done, { n: p.tries, tries: tries(p.tries) })
          : p && p.tries > 0
            ? fill(t.dle.hub.inProgress, { n: p.tries, tries: tries(p.tries) })
            : null;
        return (
          <Link
            key={mode}
            href={`/${locale}/deadlockdle/${mode}`}
            className="group relative flex items-center gap-4 overflow-hidden rounded-xl border-2 border-border bg-surface px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-accent-dim"
            style={p?.won ? { borderColor: `${accent}88` } : undefined}
          >
            {/* Brilho na cor do modo, mais forte no hover. */}
            <span
              className="pointer-events-none absolute inset-0 opacity-40 transition-opacity group-hover:opacity-80"
              style={{ background: `radial-gradient(circle at 10% 50%, ${accent}22, transparent 55%)` }}
            />
            <span
              className="relative grid size-14 shrink-0 place-items-center rounded-full border-2 bg-bg"
              style={{ borderColor: `${accent}99`, color: accent }}
            >
              <ModeIcon mode={mode} className="size-7" />
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="block text-lg font-extrabold tracking-wide">
                {t.dle.modes[mode].title}
              </span>
              <span className="block text-xs text-muted">{t.dle.modes[mode].desc}</span>
              {yesterday[mode] && (
                <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                  {t.dle.hub.yesterday}
                  {yesterday[mode]!.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={yesterday[mode]!.icon!} alt="" className="size-4 rounded-sm" />
                  )}
                  <span className="font-semibold text-eggshell">{yesterday[mode]!.name}</span>
                </span>
              )}
            </span>
            <span className="relative shrink-0 text-right">
              {p?.won ? (
                <span className="flex items-center gap-1 text-xs font-bold text-win">
                  ✓ <span className="hidden sm:inline">{status}</span>
                </span>
              ) : (
                <span className="rounded-md border border-accent-dim/60 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent">
                  {t.dle.hub.play}
                </span>
              )}
              {!p?.won && status && (
                <span className="mt-1 block text-[10px] text-muted">{status}</span>
              )}
            </span>
          </Link>
        );
      })}

      <div className="pt-3 text-center">
        <p className="text-xs text-muted">
          {fill(t.dle.hub.solved, { n: solvedCount, total: modes.length })}
        </p>
        <Countdown label={t.dle.hub.newHeroes} className="mt-1 text-xs text-muted" />
      </div>
    </div>
  );
}
