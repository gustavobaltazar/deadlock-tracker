import Image from "next/image";
import ItemBuild from "./ItemBuild";
import SoulIcon from "./SoulIcon";
import type {
  Hero,
  HighlightStat,
  MatchHighlights,
  MatchHistoryEntry,
} from "@/lib/api";
import { isWin } from "@/lib/api";
import { compact, duration, kda, modeLabel, timeAgo } from "@/lib/format";
import { fill, type Dictionary, type Locale } from "@/lib/i18n";

/** Dourado das almas (gold_color): a mesma cor que o jogo usa nos destaques. */
const GOLD = "#ffed79";

/**
 * Cartão da melhor partida do jogador, acima do histórico.
 *
 * Os números com estrela são as estatísticas em que ele foi o maior dos 12
 * jogadores da partida — o mesmo destaque que o placar de fim de jogo dá.
 * Sem metadata na API, o cartão ainda aparece com o que o histórico tem
 * (K/D/A, almas, last hits), só que sem estrelas, MVP e accolades.
 */
export default function BestMatch({
  match,
  highlights,
  hero,
  total,
  locale,
  t,
}: {
  match: MatchHistoryEntry;
  highlights: MatchHighlights | null;
  hero: Hero | undefined;
  total: number;
  locale: Locale;
  t: Dictionary;
}) {
  const win = isWin(match);
  const tint = hero?.styleHex ?? "#c6a269";
  const minutes = match.match_duration_s / 60;
  const top = new Set<HighlightStat>(highlights?.top ?? []);
  const lastHits = highlights?.stats.lastHits ?? match.last_hits;
  const denies = highlights?.stats.denies ?? match.denies;

  const tiles: {
    key: string;
    label: string;
    value: React.ReactNode;
    sub?: string;
    star?: boolean;
    tone?: string;
  }[] = [
    {
      key: "kills",
      label: t.best.kills,
      value: match.player_kills,
      star: top.has("kills"),
    },
    {
      key: "deaths",
      label: t.best.deaths,
      value: match.player_deaths,
      tone: "text-loss",
    },
    {
      key: "assists",
      label: t.best.assists,
      value: match.player_assists,
      star: top.has("assists"),
    },
    {
      key: "kda",
      label: t.match.kda,
      value: kda(match.player_kills, match.player_deaths, match.player_assists, t),
    },
    {
      key: "souls",
      label: t.best.souls,
      value: (
        <span className="inline-flex items-center gap-1">
          <SoulIcon className="h-4 w-auto text-souls" />
          {compact(match.net_worth, locale)}
        </span>
      ),
      sub: fill(t.best.perMin, {
        n: compact(Math.round(match.net_worth / minutes), locale),
      }),
      star: top.has("netWorth"),
    },
    ...(highlights
      ? [
          {
            key: "damage",
            label: t.best.damage,
            value: compact(highlights.stats.damage, locale),
            sub: fill(t.best.perMin, {
              n: compact(Math.round(highlights.stats.damage / minutes), locale),
            }),
            star: top.has("damage"),
          },
          {
            key: "healing",
            label: t.best.healing,
            value: compact(highlights.stats.healing, locale),
            star: top.has("healing"),
          },
        ]
      : []),
    {
      key: "lastHits",
      label: t.best.lastHits,
      value: lastHits,
      sub: fill(t.best.denies, { n: denies }),
      star: top.has("lastHits"),
    },
  ];

  const mvp = highlights?.mvpRank;

  return (
    <section
      className="relative overflow-hidden rounded-lg border bg-surface"
      style={{ borderColor: `${tint}66` }}
    >
      {hero?.background && (
        <Image
          src={hero.background}
          alt=""
          fill
          sizes="(max-width: 1100px) 100vw, 760px"
          className="object-cover object-center opacity-40"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(100deg, rgba(16,19,13,0.97) 0%, rgba(16,19,13,0.92) 45%, rgba(16,19,13,0.75) 75%, ${tint}22 100%)`,
        }}
      />

      <div className="relative">
        <h2
          className="flex flex-wrap items-baseline gap-x-2 border-b px-3 py-2.5 text-sm font-bold"
          style={{ borderColor: `${tint}44` }}
        >
          <span className="inline-flex items-center gap-1.5" style={{ color: GOLD }}>
            <Star className="size-4" />
            {t.best.title}
          </span>
          <span
            className="cursor-help text-xs font-normal text-muted underline decoration-dotted underline-offset-2"
            title={t.best.criteria}
          >
            {fill(t.best.subtitle, { n: total })}
          </span>
        </h2>

        <div className="flex flex-col gap-4 p-3 sm:flex-row">
          {/* Herói e resultado */}
          <div className="flex shrink-0 items-center gap-3 sm:w-[190px] sm:flex-col sm:items-start">
            <div
              className="relative size-16 shrink-0 overflow-hidden rounded-md border-2 bg-surface-2"
              style={{ borderColor: `${tint}cc` }}
            >
              {hero?.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hero.icon}
                  alt={hero.name}
                  className="size-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-bold" style={{ color: tint }}>
                {hero?.name ?? `#${match.hero_id}`}
              </div>
              <div className={"text-sm font-bold " + (win ? "text-win" : "text-loss")}>
                {win ? t.match.win : t.match.loss}
              </div>
              <div className="text-[11px] text-muted">
                {modeLabel(match.match_mode, match.game_mode, t)} ·{" "}
                {duration(match.match_duration_s)} · {timeAgo(match.start_time, t)}
              </div>
              {mvp != null && mvp >= 1 && mvp <= 3 && (
                <span
                  className={
                    "mt-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide " +
                    (mvp === 1 ? "text-bg" : "border border-accent-dim/60 text-accent")
                  }
                  style={mvp === 1 ? { background: GOLD } : undefined}
                >
                  <Star className="size-3" />
                  {mvp === 1 ? t.best.mvp : t.best.keyPlayer}
                </span>
              )}
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5 sm:grid-cols-4">
            {tiles.map((tile) => (
              <div
                key={tile.key}
                className={
                  "relative rounded-md border px-2.5 py-2 " +
                  (tile.star ? "bg-souls/[0.06]" : "border-border bg-bg/60")
                }
                style={tile.star ? { borderColor: `${GOLD}66` } : undefined}
              >
                <div className="truncate pr-4 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {tile.label}
                </div>
                <div
                  className={
                    "mt-0.5 text-lg font-bold tabular-nums " + (tile.tone ?? "")
                  }
                  style={tile.star ? { color: GOLD } : undefined}
                >
                  {tile.value}
                </div>
                {tile.sub && (
                  <div className="text-[10px] tabular-nums text-muted">{tile.sub}</div>
                )}
                {tile.star && (
                  <span
                    className="absolute right-1.5 top-1.5"
                    style={{ color: GOLD }}
                    title={t.best.topInMatch}
                  >
                    <Star className="size-3.5 drop-shadow-[0_0_4px_rgba(255,237,121,0.6)]" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {highlights ? (
          <div className="space-y-3 border-t border-border/70 px-3 py-3">
            {highlights.accolades.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                  {t.best.accolades}
                </h3>
                <ul className="flex flex-wrap gap-1.5">
                  {highlights.accolades.slice(0, 6).map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-bg/70 px-2 py-1"
                    >
                      <Tier tier={a.tier} />
                      <div className="leading-tight">
                        <div className="text-[11px] font-bold text-accent">{a.name}</div>
                        <div className="text-[10px] text-muted">{a.text}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {highlights.items.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                  {t.best.build}
                </h3>
                <ItemBuild items={highlights.items} />
              </div>
            )}
          </div>
        ) : (
          <p className="border-t border-border/70 px-3 py-2 text-[11px] text-muted">
            {t.best.noDetails}
          </p>
        )}
      </div>
    </section>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  );
}

/** Nível do accolade (1 a 3), em estrelas acesas e apagadas. */
function Tier({ tier }: { tier: number }) {
  return (
    <span
      className="flex shrink-0 gap-px"
      style={{ color: GOLD }}
      aria-label={`${tier}/3`}
    >
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          className={"size-2.5 " + (n <= tier ? "" : "opacity-20")}
        />
      ))}
    </span>
  );
}
