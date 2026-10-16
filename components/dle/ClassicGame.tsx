"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "../I18nProvider";
import StarIcon from "../StarIcon";
import {
  HeroPicker,
  WinCard,
  Yesterday,
  useDelayedWin,
  useProgress,
  type DleOption,
} from "./shared";
import type { DleArrow, DleRow, DleStatus } from "@/lib/dle";
import { apiErrorMessage, fill, type Dictionary } from "@/lib/i18n";

/** Cores dos quadrados, nos tons da paleta do jogo (verde, âmbar, vermelho). */
export const STATUS_STYLE: Record<DleStatus, { bg: string; border: string }> = {
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

export default function ClassicGame({
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
  const { rows, fresh, add } = useProgress<DleRow>("classic", day);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answer = rows.find((r) => r.correct);
  const guessed = useMemo(() => new Set(rows.map((r) => r.heroId)), [rows]);
  // Revela a vitória só depois que o último quadrado terminou de virar.
  const showWin = useDelayedWin(
    Boolean(answer),
    fresh,
    COLUMNS.length * FLIP_STEP_MS + 400,
  );

  async function submit(hero: DleOption) {
    if (pending || answer || guessed.has(hero.id)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/dle?mode=classic&day=${day}&hero=${hero.id}`);
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
      add(data.row);
    } catch {
      setError(t.dle.error);
    } finally {
      setPending(false);
    }
  }

  function shareText() {
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
    const lines = [...rows].reverse().map((r) =>
      ATTRS.map((col) => {
        const cell = r[col];
        return icon(cell.status, "arrow" in cell ? cell.arrow : null);
      }).join(""),
    );
    const n = rows.length;
    return (
      `Deadlockdle · ${t.dle.modes.classic.title} ${day} · ${n} ${n === 1 ? t.dle.tryOne : t.dle.tryMany}\n` +
      lines.join("\n")
    );
  }

  return (
    <div className="space-y-5">
      {showWin && answer ? (
        <WinCard
          name={answer.name}
          tries={rows.length}
          art={portraits[answer.heroId]}
          shareText={shareText}
        />
      ) : (
        !answer && (
          <HeroPicker heroes={heroes} exclude={guessed} pending={pending} onPick={submit} />
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
          <Board rows={rows} fresh={fresh} locale={locale} t={t} />
        </>
      )}

      <Legend t={t} />
      <Yesterday hero={yesterday} />
    </div>
  );
}

function Board({
  rows,
  fresh,
  locale,
  t,
}: {
  rows: DleRow[];
  fresh: number | null;
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
          const animate = row.heroId === fresh;
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
      {arrow && <Arrow direction={arrow} className="absolute inset-0 m-auto size-[85%] text-black/30" />}
      <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{content}</span>
    </div>
  );
}

function Arrow({ direction, className }: { direction: "up" | "down"; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className + (direction === "down" ? " rotate-180" : "")}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2 3 12h5.5v10h7V12H21z" />
    </svg>
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
  const items: { status: DleStatus; label: string; arrow?: "up" | "down" }[] = [
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
              {item.arrow && <Arrow direction={item.arrow} className="size-4 text-black/40" />}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-center text-[11px] text-muted">{t.dle.releaseNote}</p>
    </section>
  );
}
