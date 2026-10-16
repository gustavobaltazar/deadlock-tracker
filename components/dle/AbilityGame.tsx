"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { AbilityName } from "@/lib/dle-ability";
import { apiErrorMessage, fill } from "@/lib/i18n";

/**
 * Zoom de cada estágio, igual ao do servidor (lib/dle-ability). Fica copiado
 * aqui porque aquele módulo usa sharp e não pode entrar no bundle do navegador.
 */
const ZOOM = [4.5, 3.6, 2.8, 2.2, 1.7, 1.3, 1];
const STRAIGHT = ZOOM.length;

type AbilityRow = GuessBase & { abilities?: AbilityName[] };
type Bonus = { pick: number; answer: number };

export default function AbilityGame({
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
  const { rows, fresh, add } = useProgress<AbilityRow>("ability", day);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bonus, saveBonus] = useBonus(day);

  const answer = rows.find((r) => r.correct);
  const won = Boolean(answer);
  const misses = rows.filter((r) => !r.correct).length;
  const guessed = useMemo(() => new Set(rows.map((r) => r.heroId)), [rows]);
  const showWin = useDelayedWin(won, fresh, 700);
  const stage = won ? STRAIGHT : Math.min(misses, STRAIGHT);

  async function submit(hero: DleOption) {
    if (pending || won || guessed.has(hero.id)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/dle?mode=ability&day=${day}&hero=${hero.id}`);
      const data = (await res.json()) as { row?: AbilityRow; error?: string };
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
    const star = bonus
      ? `\n${bonus.pick === bonus.answer ? "⭐" : "✖️"} ${t.dle.ability.bonusShare}`
      : "";
    return (
      `Deadlockdle · ${t.dle.modes.ability.title} ${day} · ${n} ${n === 1 ? t.dle.tryOne : t.dle.tryMany}\n` +
      `🔍 ${squares.join("")}${star}`
    );
  }

  return (
    <div className="space-y-5">
      {archive && <ArchiveBanner day={day} mode="ability" />}
      <Viewer day={day} stage={stage} misses={misses} won={won} />

      {showWin && answer ? (
        <>
          {answer.abilities && (
            <BonusRound
              day={day}
              hero={answer.name}
              abilities={answer.abilities}
              bonus={bonus}
              onAnswer={saveBonus}
            />
          )}
          {/* O cartão de vitória espera o bônus: ele é parte do resultado. */}
          {(bonus || !answer.abilities) && (
            <WinCard

              archive={archive}
              name={answer.name}
              tries={rows.length}
              art={portraits[answer.heroId]}
              shareText={shareText}
            />
          )}
        </>
      ) : (
        !won && (
          <HeroPicker heroes={heroes} exclude={guessed} pending={pending} onPick={submit} />
        )
      )}

      {error && <p className="text-center text-xs text-loss">{error}</p>}

      {rows.length === 0 ? (
        <p className="mx-auto max-w-[520px] text-center text-sm text-muted">
          {fill(t.dle.ability.empty, { n: STRAIGHT })}
        </p>
      ) : (
        <GuessList rows={rows} fresh={fresh} />
      )}

      <DaySwitch mode="ability" day={day} archive={archive} />
    </div>
  );
}

/**
 * Visor do ícone: uma "lente" quadrada com miras nos cantos. A imagem nova só
 * entra depois de carregada, por cima da anterior, abrindo como um zoom-out.
 */
function Viewer({
  day,
  stage,
  misses,
  won,
}: {
  day: string;
  stage: number;
  misses: number;
  won: boolean;
}) {
  const { t } = useI18n();
  const src = `/api/dle/ability/image?day=${day}&stage=${stage}`;
  const [shown, setShown] = useState<{ src: string; stage: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => !cancelled && setShown({ src, stage });
    img.onerror = () => !cancelled && setFailed(true);
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, stage]);

  const straight = stage >= STRAIGHT;
  const zoom = ZOOM[Math.min(stage, ZOOM.length - 1)];

  return (
    <section className="relative mx-auto max-w-[520px] overflow-hidden rounded-xl border border-accent-dim/40 bg-surface px-5 py-6 text-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(242,224,191,0.10), transparent 65%)",
        }}
      />
      <h2 className="relative text-sm font-bold uppercase tracking-[0.2em] text-accent">
        {t.dle.ability.prompt}
      </h2>

      <div
        className="relative mx-auto mt-5 aspect-square w-full max-w-[240px] overflow-hidden rounded-2xl border-2 bg-[#0b0d0a]"
        style={{
          borderColor: won ? "#69e799" : "rgba(198,162,105,0.6)",
          boxShadow: won
            ? "0 0 28px -6px rgba(105,231,153,0.6), inset 0 0 40px rgba(0,0,0,0.8)"
            : "0 0 28px -10px rgba(255,237,121,0.5), inset 0 0 40px rgba(0,0,0,0.8)",
        }}
      >
        {/* Grade fina ao fundo: dá a sensação de estar olhando por um visor. */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#f2e0bf 1px, transparent 1px), linear-gradient(90deg, #f2e0bf 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {shown && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={shown.src}
            src={shown.src}
            alt=""
            draggable={false}
            className="dle-zoom-out absolute inset-0 size-full select-none p-3"
            style={{ filter: "drop-shadow(0 0 10px rgba(255,237,121,0.35))" }}
          />
        )}
        {!shown && !failed && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="size-8 animate-spin rounded-full border-2 border-accent-dim border-t-transparent" />
          </div>
        )}
        {/* Miras nos cantos. */}
        {["left-2 top-2 border-l-2 border-t-2", "right-2 top-2 border-r-2 border-t-2", "bottom-2 left-2 border-b-2 border-l-2", "bottom-2 right-2 border-b-2 border-r-2"].map(
          (pos) => (
            <span
              key={pos}
              className={`pointer-events-none absolute size-4 border-accent/60 ${pos}`}
            />
          ),
        )}
        <span
          title={t.dle.ability.zoom}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-bg/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-accent"
        >
          {zoom.toFixed(1)}×
        </span>
      </div>
      {failed && <p className="relative mt-3 text-xs text-loss">{t.dle.ability.imageError}</p>}

      {/* Progresso até o ícone inteiro: um segmento por erro. */}
      <div className="relative mx-auto mt-5 flex max-w-[240px] gap-1" aria-hidden="true">
        {Array.from({ length: STRAIGHT }, (_, i) => (
          <span
            key={i}
            className={
              "h-1.5 flex-1 rounded-full transition-colors " +
              (i < stage ? (won ? "bg-win" : "bg-accent") : "bg-border")
            }
          />
        ))}
      </div>
      <p className="relative mt-2 text-xs text-muted">
        {straight ? (
          <span className="font-semibold text-eggshell">{t.dle.ability.straight}</span>
        ) : (
          <>🔒 {fill(t.dle.ability.straightIn, { n: STRAIGHT - misses })}</>
        )}
      </p>
    </section>
  );
}

/** Rodada bônus: qual das quatro habilidades do herói é a do ícone. */
function BonusRound({
  day,
  hero,
  abilities,
  bonus,
  onAnswer,
}: {
  day: string;
  hero: string;
  abilities: AbilityName[];
  bonus: Bonus | null;
  onAnswer: (b: Bonus) => void;
}) {
  const { locale, t } = useI18n();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const name = (i: number) => (locale === "pt" ? abilities[i].pt : abilities[i].en);

  async function pick(i: number) {
    if (bonus || pending) return;
    setPending(true);
    setError(false);
    try {
      const res = await fetch(`/api/dle/ability?day=${day}&pick=${i}`);
      const data = (await res.json()) as { answer?: number };
      if (typeof data.answer !== "number") throw new Error();
      onAnswer({ pick: i, answer: data.answer });
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="dle-flip mx-auto max-w-[520px] rounded-xl border border-souls/40 bg-surface px-5 py-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-souls">
        ⭐ {t.dle.ability.bonusTitle}
      </p>
      <h3 className="mt-1 text-base font-extrabold">
        {fill(t.dle.ability.bonusPrompt, { hero })}
      </h3>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {abilities.map((_, i) => {
          const isAnswer = bonus?.answer === i;
          const isWrongPick = bonus && bonus.pick === i && !isAnswer;
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={Boolean(bonus) || pending}
              className={
                "flex items-center gap-2.5 rounded-md border-2 px-3 py-2 text-left text-sm font-bold transition-colors " +
                (isAnswer
                  ? "border-win bg-[#1f7a43] text-white"
                  : isWrongPick
                    ? "border-loss/70 bg-[#7c2a25] text-white"
                    : bonus
                      ? "border-border bg-bg/40 text-muted"
                      : "border-border bg-bg/60 hover:border-accent hover:text-accent")
              }
            >
              {/* Tecla da habilidade no jogo. */}
              <span className="grid size-6 shrink-0 place-items-center rounded border border-current/40 text-xs">
                {i + 1}
              </span>
              {name(i)}
            </button>
          );
        })}
      </div>
      {bonus && (
        <p
          className={
            "mt-3 text-sm font-semibold " + (bonus.pick === bonus.answer ? "text-win" : "text-loss")
          }
        >
          {fill(bonus.pick === bonus.answer ? t.dle.ability.bonusRight : t.dle.ability.bonusWrong, {
            name: name(bonus.answer),
          })}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-loss">{t.dle.error}</p>}
    </section>
  );
}

/** Resposta da rodada bônus, salva no navegador como o resto do progresso. */
function useBonus(day: string): [Bonus | null, (b: Bonus) => void] {
  const key = `deadlockdle:v1:ability-bonus:${day}`;
  const [bonus, setBonus] = useState<Bonus | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      setBonus(saved ? (JSON.parse(saved) as Bonus) : null);
    } catch {
      setBonus(null);
    }
  }, [key]);

  function save(b: Bonus) {
    setBonus(b);
    try {
      localStorage.setItem(key, JSON.stringify(b));
    } catch {
      // Sem storage o bônus só não sobrevive a um recarregamento.
    }
  }

  return [bonus, save];
}
