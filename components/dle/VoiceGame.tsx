"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "../I18nProvider";
import {
  GuessList,
  HeroPicker,
  WinCard,
  Yesterday,
  useDelayedWin,
  useProgress,
  type DleOption,
  type GuessBase,
} from "./shared";
import { apiErrorMessage, fill } from "@/lib/i18n";

/**
 * Erros necessários para destravar cada ajuda. A cada três, algo novo: uma
 * segunda fala, a dica em texto, a terceira fala. Ao acertar, tudo abre.
 */
const UNLOCK = { clip2: 3, hint: 6, clip3: 9 } as const;
const CLIP_UNLOCK = [0, UNLOCK.clip2, UNLOCK.clip3];

export default function VoiceGame({
  day,
  heroes,
  yesterday,
  portraits,
}: {
  day: string;
  heroes: DleOption[];
  yesterday: DleOption | null;
  portraits: Record<number, { portrait: string | null; color: string | null }>;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { rows, fresh, add } = useProgress<GuessBase>("voice", day);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const answer = rows.find((r) => r.correct);
  const won = Boolean(answer);
  const misses = rows.filter((r) => !r.correct).length;
  const guessed = useMemo(() => new Set(rows.map((r) => r.heroId)), [rows]);
  const showWin = useDelayedWin(won, fresh, 700);
  const hintOpen = won || misses >= UNLOCK.hint;

  useEffect(() => {
    if (!hintOpen || hint) return;
    fetch(`/api/dle/hint?day=${day}`)
      .then((res) => res.json())
      .then((data: { blurb?: string | null }) => setHint(data.blurb ?? null))
      .catch(() => {});
  }, [hintOpen, hint, day]);

  async function submit(hero: DleOption) {
    if (pending || won || guessed.has(hero.id)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/dle?mode=voice&day=${day}&hero=${hero.id}`);
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
      `Deadlockdle · ${t.dle.modes.voice.title} ${day} · ${n} ${n === 1 ? t.dle.tryOne : t.dle.tryMany}\n` +
      `🔊 ${squares.join("")}`
    );
  }

  return (
    <div className="space-y-5">
      <Player day={day} misses={misses} won={won} />

      <HintBox open={hintOpen} hint={hint} misses={misses} />

      {showWin && answer ? (
        <WinCard
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
          {t.dle.voice.empty}
        </p>
      ) : (
        <GuessList rows={rows} fresh={fresh} />
      )}

      <Yesterday hero={yesterday} />
    </div>
  );
}

/**
 * Player das falas do dia: botão grande de tocar, barras que dançam enquanto
 * o áudio toca e abas para as falas desbloqueadas.
 */
function Player({ day, misses, won }: { day: string; misses: number; won: boolean }) {
  const { t } = useI18n();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [clip, setClip] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [volume, setVolume] = useVolume();

  // O <audio> é recriado a cada troca de fala (key={clip}), então o volume é
  // reaplicado sempre que ele ou a fala mudam.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, clip]);

  const unlocked = (i: number) => won || misses >= CLIP_UNLOCK[i];

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    audio.currentTime = 0;
    try {
      await audio.play();
    } catch {
      setFailed(true);
    }
  }

  function choose(i: number) {
    if (!unlocked(i)) return;
    audioRef.current?.pause();
    setClip(i);
    setFailed(false);
  }

  return (
    <section className="relative mx-auto max-w-[520px] overflow-hidden rounded-xl border border-accent-dim/40 bg-surface px-5 py-6 text-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(242,224,191,0.10), transparent 65%)",
        }}
      />
      <h2 className="relative text-sm font-bold uppercase tracking-[0.2em] text-accent">
        {t.dle.voice.prompt}
      </h2>

      <div className="relative mt-5 flex items-center justify-center gap-5">
        <Bars playing={playing} mirrored />
        <button
          onClick={toggle}
          aria-label={playing ? t.dle.voice.pause : t.dle.voice.play}
          className={
            "relative grid size-20 shrink-0 place-items-center rounded-full text-bg transition-transform hover:scale-105 active:scale-95 " +
            (playing ? "" : "dle-pulse")
          }
          style={{
            background: "radial-gradient(circle at 35% 30%, #ffed79, #c6a269 60%, #92703c)",
            boxShadow: "0 0 24px rgba(255,237,121,0.35)",
          }}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="size-8" fill="currentColor" aria-hidden="true">
              <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-1 size-9" fill="currentColor" aria-hidden="true">
              <path d="M7 4.5v15l12.5-7.5z" />
            </svg>
          )}
        </button>
        <Bars playing={playing} />
      </div>

      <audio
        ref={audioRef}
        key={clip}
        src={`/api/dle/voice?day=${day}&clip=${clip}`}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      {failed && <p className="relative mt-3 text-xs text-loss">{t.dle.voice.audioError}</p>}

      <VolumeControl volume={volume} onChange={setVolume} />

      <div className="relative mt-5 flex justify-center gap-2">
        {CLIP_UNLOCK.map((need, i) => {
          const open = unlocked(i);
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={!open}
              className={
                "rounded-md border px-3 py-1.5 text-xs font-bold transition-colors " +
                (i === clip
                  ? "border-accent bg-accent/15 text-accent"
                  : open
                    ? "border-border bg-bg/60 text-ink hover:border-accent-dim"
                    : "cursor-not-allowed border-border/60 bg-bg/40 text-muted")
              }
            >
              {open ? "" : "🔒 "}
              {fill(t.dle.voice.clip, { n: i + 1 })}
              {!open && (
                <span className="block text-[10px] font-normal">
                  {fill(t.dle.voice.unlockIn, { n: need - misses })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Barras de equalizador; paradas, ficam baixas e esmaecidas. */
function Bars({ playing, mirrored }: { playing: boolean; mirrored?: boolean }) {
  const heights = [0.45, 0.8, 0.6, 1, 0.7, 0.5];
  const ordered = mirrored ? [...heights].reverse() : heights;
  return (
    <div className="flex h-12 items-center gap-1" aria-hidden="true">
      {ordered.map((h, i) => (
        <span
          key={i}
          className={"w-1.5 origin-center rounded-full bg-accent " + (playing ? "dle-eq" : "")}
          style={{
            height: `${h * 100}%`,
            opacity: playing ? 0.9 : 0.25,
            transform: playing ? undefined : "scaleY(0.3)",
            animationDelay: `${(mirrored ? heights.length - i : i) * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}

function HintBox({
  open,
  hint,
  misses,
}: {
  open: boolean;
  hint: string | null;
  misses: number;
}) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-[520px] rounded-md border border-dashed border-border px-4 py-2.5 text-center text-xs">
      <span className="font-bold uppercase tracking-wide text-muted">{t.dle.voice.hintTitle}: </span>
      {open ? (
        <span className="italic text-eggshell">“{hint ?? "…"}”</span>
      ) : (
        <span className="text-muted">
          🔒 {fill(t.dle.voice.hintLocked, { n: UNLOCK.hint - misses })}
        </span>
      )}
    </div>
  );
}

/** Volume inicial: as falas vêm masterizadas alto, para o meio de uma partida. */
const DEFAULT_VOLUME = 0.5;
const VOLUME_KEY = "deadlockdle:volume";

/** Volume das falas, lembrado entre visitas. */
function useVolume(): [number, (v: number) => void] {
  const [volume, setVolume] = useState(DEFAULT_VOLUME);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(VOLUME_KEY));
      if (localStorage.getItem(VOLUME_KEY) != null && saved >= 0 && saved <= 1) {
        setVolume(saved);
      }
    } catch {
      // Sem storage, fica o volume padrão.
    }
  }, []);

  function change(v: number) {
    setVolume(v);
    try {
      localStorage.setItem(VOLUME_KEY, String(v));
    } catch {
      // Sem storage o volume só não é lembrado.
    }
  }

  return [volume, change];
}

function VolumeControl({
  volume,
  onChange,
}: {
  volume: number;
  onChange: (v: number) => void;
}) {
  const { t } = useI18n();
  // Volume antes de silenciar, para o botão de mudo devolver o mesmo nível.
  const lastAudible = useRef(DEFAULT_VOLUME);
  if (volume > 0) lastAudible.current = volume;
  const muted = volume === 0;

  return (
    <div className="relative mx-auto mt-4 flex max-w-[240px] items-center gap-2.5">
      <button
        onClick={() => onChange(muted ? lastAudible.current : 0)}
        aria-label={muted ? t.dle.voice.unmute : t.dle.voice.mute}
        title={muted ? t.dle.voice.unmute : t.dle.voice.mute}
        className="shrink-0 text-muted transition-colors hover:text-accent"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
          {muted ? (
            <path d="m22 9-6 6m0-6 6 6" />
          ) : (
            <>
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              {volume > 0.5 && <path d="M18.5 5.5a9 9 0 0 1 0 13" />}
            </>
          )}
        </svg>
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={t.dle.voice.volume}
        className="h-1.5 flex-1 cursor-pointer accent-[#c6a269]"
      />
      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted">
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
}
