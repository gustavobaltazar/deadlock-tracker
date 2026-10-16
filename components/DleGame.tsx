"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "./I18nProvider";
import StarIcon from "./StarIcon";
import type { DleArrow, DleRow, DleStatus } from "@/lib/dle";
import { apiErrorMessage, fill, type Dictionary } from "@/lib/i18n";

export type DleOption = { id: number; name: string; icon: string | null };

/** Cores dos quadrados, nos tons da paleta do jogo (verde, âmbar, vermelho). */
const STATUS_STYLE: Record<DleStatus, { bg: string; border: string }> = {
  correct: { bg: "#1f7a43", border: "#69e799" },
  partial: { bg: "#a8660b", border: "#f0a53a" },
  wrong: { bg: "#7c2a25", border: "#cc544e" },
};

/** Atributos comparados, na ordem das colunas (a primeira é o herói). */
const ATTRS = [
  "gender",
  "role",
  "weapon",
  "tags",
  "complexity",
  "health",
  "release",
] as const;
const COLUMNS = ["hero", ...ATTRS] as const;

/** Atraso entre um quadrado e o próximo ao revelar um palpite. */
const FLIP_STEP_MS = 220;

/** Chave do progresso do dia no navegador. Muda com o dia: cada um é um jogo novo. */
const storageKey = (day: string) => `deadlockdle:v1:${day}`;

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export default function DleGame({
  day,
  heroes,
  yesterday,
  portraits,
}: {
  day: string;
  heroes: DleOption[];
  yesterday: DleOption | null;
  /** Retrato e cor de cada herói, para o cartão de vitória. */
  portraits: Record<number, { portrait: string | null; color: string | null }>;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [rows, setRows] = useState<DleRow[]>([]);
  // Só o palpite recém-enviado anima; os restaurados do navegador aparecem prontos.
  const [animatedId, setAnimatedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Progresso salvo: lido depois de montar, para o HTML do servidor (sempre
  // vazio) bater com a primeira renderização do cliente.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(day));
      setRows(saved ? (JSON.parse(saved) as DleRow[]) : []);
      setAnimatedId(null);
    } catch {
      // Navegador sem storage (aba anônima restrita): o jogo funciona sem salvar.
    }
  }, [day]);

  const won = rows.some((r) => r.correct);
  const guessed = useMemo(() => new Set(rows.map((r) => r.heroId)), [rows]);

  const options = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return heroes
      .filter((h) => !guessed.has(h.id))
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
  }, [query, heroes, guessed]);

  async function submit(hero: DleOption) {
    if (pending || won || guessed.has(hero.id)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/dle?day=${day}&hero=${hero.id}`);
      const data = (await res.json()) as { row?: DleRow; error?: string };
      if (data.error === "stale_day") {
        // Virou o dia com a página aberta: carrega o herói novo.
        setError(t.dle.newDay);
        router.refresh();
        return;
      }
      if (!data.row) {
        setError(apiErrorMessage(data.error, t, t.dle.error));
        return;
      }
      const next = [data.row, ...rows];
      setRows(next);
      setAnimatedId(data.row.heroId);
      setQuery("");
      setOpen(false);
      try {
        localStorage.setItem(storageKey(day), JSON.stringify(next));
      } catch {
        // Sem storage o progresso só não sobrevive a um recarregamento.
      }
    } catch {
      setError(t.dle.error);
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
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
      const choice = options[active] ?? options[0];
      if (choice) submit(choice);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Revela a vitória só depois que o último quadrado terminou de virar.
  const [showWin, setShowWin] = useState(false);
  useEffect(() => {
    if (!won) return setShowWin(false);
    if (animatedId == null) return setShowWin(true);
    const timer = setTimeout(
      () => setShowWin(true),
      COLUMNS.length * FLIP_STEP_MS + 400,
    );
    return () => clearTimeout(timer);
  }, [won, animatedId]);

  const answer = rows.find((r) => r.correct);

  return (
    <div className="space-y-5">
      {showWin && answer ? (
        <WinCard
          row={answer}
          tries={rows.length}
          rows={rows}
          day={day}
          art={portraits[answer.heroId]}
          t={t}
        />
      ) : (
        !won && (
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
                // Não desabilita durante a conferência: um campo desabilitado
                // perde o foco e o próximo palpite digitado se perderia.
                className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent"
              />
              <button
                onClick={() => options[active] && submit(options[active])}
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
                        submit(h);
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
        )
      )}

      {error && <p className="text-center text-xs text-loss">{error}</p>}

      {rows.length === 0 ? (
        <p className="mx-auto max-w-[520px] text-center text-sm text-muted">
          {t.dle.empty}
        </p>
      ) : (
        <>
          <p className="text-center text-xs text-muted">
            {fill(t.dle.attempts, { n: rows.length })}
          </p>
          <Board rows={rows} animatedId={animatedId} locale={locale} t={t} />
        </>
      )}

      <Legend t={t} />

      {yesterday && (
        <p className="flex items-center justify-center gap-2 text-xs text-muted">
          {t.dle.yesterday}
          {yesterday.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={yesterday.icon} alt="" className="size-5 rounded-sm" />
          )}
          <span className="font-bold text-ink">{yesterday.name}</span>
        </p>
      )}
    </div>
  );
}

function Board({
  rows,
  animatedId,
  locale,
  t,
}: {
  rows: DleRow[];
  animatedId: number | null;
  locale: string;
  t: Dictionary;
}) {
  return (
    // A grade tem largura fixa (8 quadrados); no celular ela rola de lado em
    // vez de espremer os quadrados.
    <div className="overflow-x-auto pb-2">
      <div className="mx-auto grid w-max grid-cols-[repeat(8,4.5rem)] gap-1.5 sm:grid-cols-[repeat(8,5.25rem)]">
        {COLUMNS.map((col) => (
          <div
            key={col}
            className="border-b-2 border-accent-dim/50 pb-1 text-center text-[10px] font-bold uppercase tracking-wide text-muted"
          >
            {t.dle.columns[col]}
          </div>
        ))}

        {rows.map((row) => {
          const animate = row.heroId === animatedId;
          return COLUMNS.map((col, i) => (
            <div
              key={row.heroId + col}
              className={animate ? "dle-flip" : undefined}
              style={animate ? { animationDelay: `${i * FLIP_STEP_MS}ms` } : undefined}
            >
              {col === "hero" ? (
                <HeroTile row={row} />
              ) : (
                <Tile row={row} col={col} locale={locale} t={t} />
              )}
            </div>
          ));
        })}
      </div>
    </div>
  );
}

function HeroTile({ row }: { row: DleRow }) {
  return (
    <div
      className="relative aspect-square overflow-hidden rounded-md border-2 bg-surface-2"
      style={{ borderColor: row.correct ? STATUS_STYLE.correct.border : "#3b3a31" }}
      title={row.name}
    >
      {row.icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.icon} alt={row.name} className="size-full object-cover" />
      )}
      <span className="absolute inset-x-0 bottom-0 truncate bg-bg/80 px-1 text-center text-[9px] font-bold">
        {row.name}
      </span>
    </div>
  );
}

function Tile({
  row,
  col,
  locale,
  t,
}: {
  row: DleRow;
  col: (typeof ATTRS)[number];
  locale: string;
  t: Dictionary;
}) {
  const cell = row[col];
  const style = STATUS_STYLE[cell.status];
  const arrow: DleArrow = "arrow" in cell ? (cell.arrow ?? null) : null;

  let content: React.ReactNode;
  switch (col) {
    case "gender": {
      const genders = t.dle.gender as Record<string, string>;
      content = genders[row.gender.value] ?? "—";
      break;
    }
    case "role":
      content = row.role.value
        ? row.role.value[0].toUpperCase() + row.role.value.slice(1)
        : "—";
      break;
    case "weapon":
      content = row.weapon.value || "—";
      break;
    case "tags":
      content = (
        <span className="flex flex-col gap-0.5 text-[9px] leading-tight sm:text-[10px]">
          {row.tags.value.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </span>
      );
      break;
    case "complexity":
      content = (
        <span className="flex gap-0.5" aria-label={`${row.complexity.value}/4`}>
          {[1, 2, 3, 4].map((n) => (
            <StarIcon
              key={n}
              className={"size-3 " + (n <= row.complexity.value ? "" : "opacity-25")}
            />
          ))}
        </span>
      );
      break;
    case "health":
      content = <span className="text-sm tabular-nums">{row.health.value}</span>;
      break;
    case "release":
      content = formatMonth(row.release.value, locale);
      break;
  }

  return (
    <div
      className="relative grid aspect-square place-items-center overflow-hidden rounded-md border-2 p-1 text-center text-[11px] font-bold leading-tight text-white shadow-inner sm:text-xs"
      style={{ background: style.bg, borderColor: style.border }}
    >
      {/* Seta de fundo, como no Loldle: aponta para onde está o valor certo. */}
      {arrow && (
        <svg
          viewBox="0 0 24 24"
          className={
            "absolute inset-0 m-auto size-[85%] text-black/30 " +
            (arrow === "down" ? "rotate-180" : "")
          }
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2 3 12h5.5v10h7V12H21z" />
        </svg>
      )}
      <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{content}</span>
    </div>
  );
}

function formatMonth(value: string, locale: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return "—";
  const name = new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-US", {
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(".", "");
  return (
    <span className="flex flex-col">
      <span className="capitalize">{name}</span>
      <span>{year}</span>
    </span>
  );
}

function Legend({ t }: { t: Dictionary }) {
  const items: { status: DleStatus; label: string; arrow?: DleArrow }[] = [
    { status: "correct", label: t.dle.correct },
    { status: "partial", label: t.dle.partial },
    { status: "wrong", label: t.dle.wrong },
    { status: "wrong", label: t.dle.higher, arrow: "up" },
    { status: "wrong", label: t.dle.lower, arrow: "down" },
  ];
  return (
    <section className="mx-auto max-w-[620px] rounded-lg border border-border bg-surface px-4 py-3">
      <h2 className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted">
        {t.dle.legend}
      </h2>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span
              className="relative grid size-5 place-items-center overflow-hidden rounded border-2"
              style={{
                background: STATUS_STYLE[item.status].bg,
                borderColor: STATUS_STYLE[item.status].border,
              }}
            >
              {item.arrow && (
                <svg
                  viewBox="0 0 24 24"
                  className={
                    "size-4 text-black/40 " + (item.arrow === "down" ? "rotate-180" : "")
                  }
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2 3 12h5.5v10h7V12H21z" />
                </svg>
              )}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-center text-[11px] text-muted">{t.dle.releaseNote}</p>
    </section>
  );
}

function WinCard({
  row,
  tries,
  rows,
  day,
  art,
  t,
}: {
  row: DleRow;
  tries: number;
  rows: DleRow[];
  day: string;
  art: { portrait: string | null; color: string | null } | undefined;
  t: Dictionary;
}) {
  const color = art?.color ?? "#69e799";
  const [copied, setCopied] = useState(false);

  async function share() {
    const icon = (status: DleStatus, arrow?: DleArrow) =>
      status === "correct"
        ? "🟩"
        : status === "partial"
          ? "🟧"
          : arrow === "up"
            ? "⬆️"
            : arrow === "down"
              ? "⬇️"
              : "🟥";
    const lines = [...rows]
      .reverse()
      .map((r) =>
        ATTRS
          .map((col) => {
            const cell = r[col];
            return icon(cell.status, "arrow" in cell ? cell.arrow : null);
          })
          .join(""),
      );
    const text =
      `Deadlockdle ${day} · ${tries} ${tries === 1 ? t.dle.tryOne : t.dle.tryMany}\n` +
      lines.join("\n") +
      `\n${window.location.origin}${window.location.pathname}`;
    try {
      await navigator.clipboard.writeText(text);
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
            {fill(t.dle.winBody, {
              hero: row.name,
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
            alt={row.name}
            className="hidden h-36 w-auto drop-shadow-2xl sm:block"
          />
        )}
      </div>
    </section>
  );
}

/** Tempo até a meia-noite UTC, quando o herói troca. */
function Countdown({ label }: { label: string }) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const next = Math.ceil((now + 1) / 86_400_000) * 86_400_000;
      const remaining = next - now;
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
    <p className="mt-3 text-xs text-muted">
      {label}{" "}
      <span className="font-bold tabular-nums text-ink">
        {pad(Math.floor(total / 3600))}:{pad(Math.floor((total % 3600) / 60))}:
        {pad(total % 60)}
      </span>
    </p>
  );
}
