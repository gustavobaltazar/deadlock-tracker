"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "../I18nProvider";
import { fill } from "@/lib/i18n";

/** Peças comuns aos modos do Deadlockdle. */

export type DleOption = { id: number; name: string; icon: string | null };
export type DleMode = "classic" | "voice" | "ability" | "emoji";

/** Modos na ordem em que aparecem nas abas, no menu e na home. */
export const DLE_MODES: DleMode[] = ["classic", "voice", "ability", "emoji"];

/** Tudo que um palpite precisa ter, em qualquer modo. */
export type GuessBase = { heroId: number; name: string; icon: string | null; correct: boolean };

/**
 * Chave do progresso do dia no navegador. O clássico mantém a chave original
 * (sem o modo) para não apagar o progresso de quem já jogou.
 */
export function storageKey(mode: DleMode, day: string) {
  return mode === "classic" ? `deadlockdle:v1:${day}` : `deadlockdle:v1:${mode}:${day}`;
}

export function readProgress<T>(mode: DleMode, day: string): T[] {
  try {
    const saved = localStorage.getItem(storageKey(mode, day));
    return saved ? (JSON.parse(saved) as T[]) : [];
  } catch {
    // Navegador sem storage (aba anônima restrita): o jogo funciona sem salvar.
    return [];
  }
}

/**
 * Palpites do dia, salvos no navegador. Lidos depois de montar, para o HTML
 * do servidor (sempre vazio) bater com a primeira renderização do cliente.
 */
export function useProgress<T extends GuessBase>(mode: DleMode, day: string) {
  const [rows, setRows] = useState<T[]>([]);
  // Só o palpite recém-enviado anima; os restaurados aparecem prontos.
  const [fresh, setFresh] = useState<number | null>(null);

  useEffect(() => {
    setRows(readProgress<T>(mode, day));
    setFresh(null);
  }, [mode, day]);

  function add(row: T) {
    setRows((prev) => {
      const next = [row, ...prev];
      try {
        localStorage.setItem(storageKey(mode, day), JSON.stringify(next));
      } catch {
        // Sem storage o progresso só não sobrevive a um recarregamento.
      }
      return next;
    });
    setFresh(row.heroId);
  }

  return { rows, fresh, add };
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Campo de busca de herói com lista sugerida, teclado e mouse. */
export function HeroPicker({
  heroes,
  exclude,
  pending,
  onPick,
}: {
  heroes: DleOption[];
  exclude: Set<number>;
  pending: boolean;
  onPick: (hero: DleOption) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return heroes
      .filter((h) => !exclude.has(h.id))
      .map((h) => ({ hero: h, name: normalize(h.name) }))
      .filter((h) => h.name.includes(q))
      // Quem começa com o texto digitado vem primeiro.
      .sort(
        (a, b) =>
          Number(b.name.startsWith(q)) - Number(a.name.startsWith(q)) ||
          a.hero.name.localeCompare(b.hero.name),
      )
      .slice(0, 8)
      .map((h) => h.hero);
  }, [query, heroes, exclude]);

  function pick(hero: DleOption | undefined) {
    if (!hero || pending) return;
    onPick(hero);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(options[active] ?? options[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-[420px]">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={t.dle.placeholder}
          aria-label={t.dle.placeholder}
          autoComplete="off"
          autoFocus
          // Não desabilita durante a conferência: um campo desabilitado perde
          // o foco e o próximo palpite digitado se perderia.
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          onClick={() => pick(options[active])}
          disabled={pending || options.length === 0}
          className="rounded-md border border-accent-dim/60 bg-accent/10 px-4 text-sm font-bold text-accent hover:bg-accent/20 disabled:opacity-40"
        >
          {t.dle.guess}
        </button>
      </div>

      {open && query && (
        <ul
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-md border border-border bg-surface shadow-xl"
          role="listbox"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted">{t.dle.noMatch}</li>
          ) : (
            options.map((h, i) => (
              <li
                key={h.id}
                role="option"
                aria-selected={i === active}
                // mousedown, e não click: dispara antes do blur fechar a lista.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(h);
                }}
                onMouseEnter={() => setActive(i)}
                className={
                  "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm " +
                  (i === active ? "bg-surface-2 text-accent" : "")
                }
              >
                {h.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.icon} alt="" className="size-8 rounded bg-surface-2" />
                )}
                <span className="font-semibold">{h.name}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/** Milissegundos até a meia-noite UTC, quando os heróis trocam. */
function untilReset() {
  const now = Date.now();
  return Math.ceil((now + 1) / 86_400_000) * 86_400_000 - now;
}

/** Contagem regressiva até o próximo herói; recarrega o jogo na virada. */
export function Countdown({ label, className }: { label: string; className?: string }) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const remaining = untilReset();
      setLeft(remaining);
      if (remaining < 1000) router.refresh();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [router]);

  if (left == null) return null;
  const total = Math.floor(left / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    // <span> em bloco, e não <p>: o contador também aparece dentro de links.
    <span className={"block " + (className ?? "mt-3 text-xs text-muted")}>
      {label}{" "}
      <span className="font-bold tabular-nums text-ink">
        {pad(Math.floor(total / 3600))}:{pad(Math.floor((total % 3600) / 60))}:
        {pad(total % 60)}
      </span>
    </span>
  );
}

/** Mostra a vitória só depois que a animação do palpite certo terminou. */
export function useDelayedWin(won: boolean, fresh: number | null, delayMs: number) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!won) return setShow(false);
    if (fresh == null) return setShow(true);
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [won, fresh, delayMs]);
  return show;
}

/** Cartão de vitória: retrato do herói, tentativas, contador e compartilhar. */
export function WinCard({
  name,
  tries,
  art,
  shareText,
  archive = false,
}: {
  archive?: boolean;
  name: string;
  tries: number;
  art: { portrait: string | null; color: string | null } | undefined;
  shareText: () => string;
}) {
  const { t } = useI18n();
  const color = art?.color ?? "#69e799";
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      await navigator.clipboard.writeText(
        `${shareText()}\n${window.location.origin}${window.location.pathname}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão de clipboard: o botão só não confirma.
    }
  }

  return (
    <section
      className="relative mx-auto max-w-[620px] overflow-hidden rounded-lg border bg-surface"
      style={{ borderColor: `${color}88`, boxShadow: `0 0 32px -12px ${color}` }}
    >
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at 85% 60%, ${color}33, transparent 60%)` }}
      />
      <div className="relative flex items-center gap-4 p-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-extrabold text-win">{t.dle.winTitle}</h2>
          <p className="mt-1 text-sm text-eggshell">
            {fill(archive ? t.dle.winBodyYesterday : t.dle.winBody, {
              hero: name,
              n: tries,
              tries: tries === 1 ? t.dle.tryOne : t.dle.tryMany,
            })}
          </p>
          <Countdown label={t.dle.next} />
          <button
            onClick={share}
            className="mt-3 rounded-md border border-accent-dim/60 bg-accent/10 px-4 py-2 text-sm font-bold text-accent hover:bg-accent/20"
          >
            {copied ? t.dle.copied : t.dle.share}
          </button>
        </div>
        {art?.portrait && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art.portrait}
            alt={name}
            className="hidden h-36 w-auto drop-shadow-2xl sm:block"
          />
        )}
      </div>
    </section>
  );
}

/** Palpites dos modos de acertou-ou-não (Voz, Habilidade): uma linha por herói. */
export function GuessList({ rows, fresh }: { rows: GuessBase[]; fresh: number | null }) {
  return (
    <ul className="mx-auto max-w-[420px] space-y-1.5">
      {rows.map((r) => (
        <li
          key={r.heroId}
          className={
            "flex items-center gap-3 rounded-md border-2 px-2 py-1.5 " +
            (r.heroId === fresh ? "dle-flip " : "") +
            (r.correct
              ? "border-win bg-[#1f7a43] text-white"
              : "border-loss/70 bg-[#7c2a25] text-white")
          }
        >
          {r.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.icon} alt="" className="size-10 rounded bg-surface-2" />
          )}
          <span className="flex-1 text-sm font-bold">{r.name}</span>
          <span className="pr-1 text-lg" aria-hidden="true">
            {r.correct ? "✓" : "✕"}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Data do jogo por extenso curto ("15/10" ou "10/15"), no fuso UTC do jogo. */
function shortDate(day: string, locale: string) {
  return new Date(day + "T00:00:00Z").toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

/** Faixa no topo do desafio de ontem, para ninguém confundir com o de hoje. */
export function ArchiveBanner({ day, mode }: { day: string; mode: DleMode }) {
  const { locale, t } = useI18n();
  return (
    <div className="mx-auto flex max-w-[520px] flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border border-[#b48cff]/50 bg-[#b48cff]/10 px-4 py-2 text-xs">
      <span className="font-bold uppercase tracking-widest text-[#cdb4ff]">
        ↺ {t.dle.archive.badge} · {shortDate(day, locale)}
      </span>
      <Link
        href={`/${locale}/deadlockdle/${mode}`}
        className="font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
      >
        {t.dle.archive.back} →
      </Link>
    </div>
  );
}

/**
 * Rodapé de cada modo: no desafio de hoje, o convite para jogar o de ontem
 * (ou o selo de que ele já foi resolvido); no de ontem, a volta para hoje.
 */
export function DaySwitch({
  mode,
  day,
  archive,
}: {
  mode: DleMode;
  day: string;
  archive: boolean;
}) {
  const { locale, t } = useI18n();
  const [solved, setSolved] = useState(false);
  const yesterday = previousDay(day);

  useEffect(() => {
    if (archive) return;
    setSolved(readProgress<GuessBase>(mode, yesterday).some((r) => r.correct));
  }, [archive, mode, yesterday]);

  const base = `/${locale}/deadlockdle/${mode}`;
  if (archive) {
    return (
      <p className="text-center">
        <Link href={base} className="text-xs font-semibold text-muted hover:text-ink">
          ← {t.dle.archive.back}
        </Link>
      </p>
    );
  }

  return (
    <Link
      href={`${base}?day=yesterday`}
      className="group mx-auto flex max-w-[420px] items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3 transition-colors hover:border-[#b48cff]/70 hover:bg-[#b48cff]/5"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#b48cff]/50 text-lg text-[#cdb4ff]">
        ↺
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">
          {solved ? t.dle.archive.solved : t.dle.archive.play}
          {solved && <span className="ml-1.5 text-win">✓</span>}
        </span>
        <span className="block text-xs text-muted">
          {solved ? t.dle.archive.review : t.dle.archive.playDesc}
        </span>
      </span>
      <span className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink">
        →
      </span>
    </Link>
  );
}

/** Dia anterior, "AAAA-MM-DD" (cópia do lib/dle, que não entra no navegador). */
export function previousDay(day: string): string {
  return new Date(Date.parse(day + "T00:00:00Z") - 86_400_000).toISOString().slice(0, 10);
}
