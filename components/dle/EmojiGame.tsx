"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "../I18nProvider";
import {
  ArchiveBanner,
  DaySwitch,
  GuessList,
  HeroPicker,
  WinCard,
  useDelayedWin,
  useProgress,
  type DleOption,
  type GuessBase,
} from "./shared";
import { apiErrorMessage, fill } from "@/lib/i18n";

/** Emojis por partida, igual a lib/dle-emoji (que não entra no navegador). */
const COUNT = 5;

export default function EmojiGame({
  day,
  heroes,
  archive,
  portraits,
}: {
  day: string;
  heroes: DleOption[];
  archive: boolean;
  portraits: Record<number, { portrait: string | null; color: string | null }>;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { rows, fresh, add } = useProgress<GuessBase>("emoji", day);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answer = rows.find((r) => r.correct);
  const won = Boolean(answer);
  const misses = rows.filter((r) => !r.correct).length;
  const guessed = useMemo(() => new Set(rows.map((r) => r.heroId)), [rows]);
  const showWin = useDelayedWin(won, fresh, 700);
  // Um emoji de início e mais um a cada erro; ao acertar, todos.
  const revealed = won ? COUNT : Math.min(misses + 1, COUNT);

  async function submit(hero: DleOption) {
    if (pending || won || guessed.has(hero.id)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/dle?mode=emoji&day=${day}&hero=${hero.id}`);
      const data = (await res.json()) as { row?: GuessBase; error?: string };
      if (data.error === "stale_day") {
        setError(t.dle.newDay);
        router.refresh();
        return;
      }
      if (!data.row) {
        setError(apiErrorMessage(data.error, t, t.dle.error));
        return;
      }
      add(data.row);
    } catch {
      setError(t.dle.error);
    } finally {
      setPending(false);
    }
  }

  function shareText() {
    const n = rows.length;
    const squares = [...rows].reverse().map((r) => (r.correct ? "🟩" : "🟥"));
    return (
      `Deadlockdle · ${t.dle.modes.emoji.title} ${day} · ${n} ${n === 1 ? t.dle.tryOne : t.dle.tryMany}\n` +
      `😀 ${squares.join("")}`
    );
  }

  return (
    <div className="space-y-5">
      {archive && <ArchiveBanner day={day} mode="emoji" />}
      <Board day={day} revealed={revealed} misses={misses} won={won} />

      {showWin && answer ? (
        <WinCard
          archive={archive}
          name={answer.name}
          tries={rows.length}
          art={portraits[answer.heroId]}
          shareText={shareText}
        />
      ) : (
        !won && (
          <HeroPicker heroes={heroes} exclude={guessed} pending={pending} onPick={submit} />
        )
      )}

      {error && <p className="text-center text-xs text-loss">{error}</p>}

      {rows.length === 0 ? (
        <p className="mx-auto max-w-[520px] text-center text-sm text-muted">
          {fill(t.dle.emoji.empty, { n: COUNT })}
        </p>
      ) : (
        <GuessList rows={rows} fresh={fresh} />
      )}

      <DaySwitch mode="emoji" day={day} archive={archive} />
    </div>
  );
}

/**
 * Os cinco espaços de emoji. Os revelados viram como carta ao chegar; os
 * fechados mostram quantos erros faltam para abrir.
 */
function Board({
  day,
  revealed,
  misses,
  won,
}: {
  day: string;
  revealed: number;
  misses: number;
  won: boolean;
}) {
  const { t } = useI18n();
  const [emojis, setEmojis] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  // Quantos já estavam na tela antes da última busca: só os novos animam.
  const [seen, setSeen] = useState<number | null>(null);
  const shownRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dle/emoji?day=${day}&n=${revealed}`)
      .then((res) => res.json())
      .then((data: { emojis?: string[] }) => {
        if (cancelled || !data.emojis) return;
        // Na primeira carga (progresso restaurado) nada anima.
        setSeen(shownRef.current === 0 ? null : shownRef.current);
        shownRef.current = data.emojis.length;
        setEmojis(data.emojis);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [day, revealed]);

  return (
    <section className="relative mx-auto max-w-[520px] overflow-hidden rounded-xl border border-accent-dim/40 bg-surface px-4 py-6 text-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(255,143,177,0.10), transparent 65%)",
        }}
      />
      <h2 className="relative text-sm font-bold uppercase tracking-[0.2em] text-accent">
        {t.dle.emoji.prompt}
      </h2>

      <div className="relative mt-5 flex justify-center gap-2 sm:gap-3">
        {Array.from({ length: COUNT }, (_, i) => {
          const emoji = emojis[i];
          const open = i < revealed && emoji;
          return (
            <div
              key={open ? `e${i}` : `l${i}`}
              className={
                "grid aspect-square w-[18%] max-w-20 place-items-center rounded-xl border-2 " +
                (open
                  ? (seen != null && i >= seen ? "dle-flip " : "") +
                    (won ? "border-win/70 bg-win/10" : "border-accent-dim/70 bg-bg")
                  : "border-dashed border-border bg-bg/40")
              }
              style={open && seen != null && i >= seen ? { animationDelay: "120ms" } : undefined}
            >
              {open ? (
                <Emoji char={emoji} />
              ) : (
                <span className="flex flex-col items-center leading-tight text-muted">
                  <span className="text-xl font-black">?</span>
                  {!won && i >= revealed && (
                    <span className="text-[9px]">
                      {fill(t.dle.emoji.unlockIn, { n: i - misses })}
                    </span>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {failed && <p className="relative mt-3 text-xs text-loss">{t.dle.error}</p>}
    </section>
  );
}

/**
 * Emoji desenhado pelo Twemoji, para ficar igual em qualquer sistema — o
 * Windows, por exemplo, não tem alguns emojis novos. Se a imagem falhar, cai
 * no emoji do próprio sistema.
 */
function Emoji({ char }: { char: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <span className="text-4xl">{char}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={twemoji(char)}
      alt={char}
      draggable={false}
      onError={() => setBroken(true)}
      className="size-[62%] select-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
    />
  );
}

/**
 * Arquivo do Twemoji para um emoji: os códigos em hexadecimal unidos por "-".
 * O seletor de variação (FE0F) só entra no nome em sequências com ZWJ.
 */
function twemoji(char: string) {
  const text = char.includes("‍") ? char : char.replace(/️/g, "");
  const code = [...text].map((c) => c.codePointAt(0)!.toString(16)).join("-");
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${code}.svg`;
}
