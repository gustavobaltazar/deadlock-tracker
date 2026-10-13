"use client";

import { useI18n } from "./I18nProvider";
import ItemBuild from "./ItemBuild";
import SoulIcon from "./SoulIcon";
import type { MatchView } from "@/lib/api";
import { isWin } from "@/lib/api";
import { compact, duration, kda, modeLabel, timeAgo } from "@/lib/format";
import { fill } from "@/lib/i18n";

export default function MatchRow({
  match,
  expanded,
  onToggle,
}: {
  match: MatchView;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { locale, t } = useI18n();
  const win = isWin(match);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={
        "flex cursor-pointer items-center gap-2.5 border-l-4 px-2.5 py-2.5 transition-colors " +
        (win
          ? "border-l-win bg-win-bg/40 hover:bg-win-bg/70"
          : "border-l-loss bg-loss-bg/40 hover:bg-loss-bg/70")
      }
    >
      <div className="w-20 shrink-0">
        <div className={"text-sm font-bold " + (win ? "text-win" : "text-loss")}>
          {win ? t.match.win : t.match.loss}
        </div>
        <div className="text-[11px] text-muted">
          {timeAgo(match.start_time, t)}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {match.heroIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={match.heroIcon}
            alt={match.heroName}
            className="size-11 shrink-0 rounded-md bg-surface-2 object-cover"
          />
        ) : (
          <span className="size-11 shrink-0 rounded-md bg-surface-2" />
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{match.heroName}</div>
          <div className="text-[11px] text-muted">
            {modeLabel(match.match_mode, match.game_mode, t)} ·{" "}
            {duration(match.match_duration_s)} ·{" "}
            {fill(t.match.level, { n: match.hero_level })}
          </div>
        </div>
      </div>

      <div className="w-24 shrink-0 text-center">
        <div className="text-sm font-semibold tabular-nums">
          {match.player_kills} / <span className="text-loss">{match.player_deaths}</span>{" "}
          / {match.player_assists}
        </div>
        <div className="text-[11px] text-muted">
          {kda(match.player_kills, match.player_deaths, match.player_assists, t)}{" "}
          {t.match.kda}
        </div>
      </div>

      <div className="hidden sm:block">
        <ItemBuild items={match.items} />
      </div>

      <div className="hidden w-24 shrink-0 text-right sm:block">
        <div
          className="flex items-center justify-end gap-1 text-sm tabular-nums"
          title={t.match.souls}
        >
          <SoulIcon className="h-3.5 w-auto text-souls" />
          {compact(match.net_worth, locale)}
        </div>
        <div className="text-[11px] text-muted">
          {fill(t.match.lastHits, { lh: match.last_hits, dn: match.denies })}
        </div>
      </div>

      <div className="hidden w-12 shrink-0 text-right text-xs font-semibold tabular-nums sm:block">
        {match.ranked_delta != null && (
          <span className={match.ranked_delta >= 0 ? "text-win" : "text-loss"}>
            {match.ranked_delta >= 0 ? "+" : ""}
            {match.ranked_delta}
          </span>
        )}
      </div>

      <svg
        viewBox="0 0 24 24"
        className={
          "size-4 shrink-0 text-muted transition-transform " +
          (expanded ? "rotate-180" : "")
        }
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
