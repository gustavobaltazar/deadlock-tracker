"use client";

import { useEffect, useState } from "react";
import { useI18n } from "./I18nProvider";
import ItemBuild, { ItemHover } from "./ItemBuild";
import SoulIcon from "./SoulIcon";
import type { BuildAnalysis, MatchDetail, MatchPlayer } from "@/lib/api";
import { compact as compactNum } from "@/lib/format";
import {
  apiErrorMessage,
  fill,
  type Dictionary,
  type Locale,
} from "@/lib/i18n";

/** Times do Deadlock, nas cores oficiais team1_color / team2_color. */
const TEAMS = [
  { id: 0, name: "Amber Hand", color: "#d4860b" },
  { id: 1, name: "Sapphire Flame", color: "#4d75c3" },
];



export default function MatchDetails({
  matchId,
  accountId,
}: {
  matchId: number;
  accountId: number;
}) {
  const [data, setData] = useState<{
    detail: MatchDetail;
    analysis: BuildAnalysis | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { locale, t } = useI18n();

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/match/${matchId}?account_id=${accountId}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (json.error) {
          setError(apiErrorMessage(json.error, t, t.match.detailsError));
          return;
        }
        setData(json);
      } catch {
        if (!controller.signal.aborted) setError(t.match.detailsError);
      }
    })();
    return () => controller.abort();
  }, [matchId, accountId, t]);

  if (error) {
    return <p className="px-4 py-5 text-xs text-loss">{error}</p>;
  }

  if (!data) {
    return (
      <p className="px-4 py-5 text-xs text-muted">{t.match.loadingDetails}</p>
    );
  }

  return (
    <div className="space-y-4 rounded-b-md border-t border-border bg-bg/40 px-3 py-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {TEAMS.map((team) => {
          const players = data.detail.players
            .filter((p) => p.team === team.id)
            .sort((a, b) => (a.lane ?? 9) - (b.lane ?? 9));
          const won = data.detail.winningTeam === team.id;

          return (
            <div
              key={team.id}
              className="overflow-hidden rounded-md border border-border"
            >
              <div
                className="flex items-center justify-between px-3 py-1.5 text-xs font-bold"
                style={{ background: team.color + "22", color: team.color }}
              >
                <span>{team.name}</span>
                <span className={won ? "text-win" : "text-muted"}>
                  {won ? t.match.win : t.match.loss}
                </span>
              </div>
              <div className="divide-y divide-border">
                {players.map((p) => (
                  <PlayerRow
                    key={p.accountId + "-" + p.heroId}
                    player={p}
                    highlight={p.accountId === accountId}
                    locale={locale}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {data.analysis && <BuildScore analysis={data.analysis} t={t} />}
    </div>
  );
}

function PlayerRow({
  player,
  highlight,
  locale,
}: {
  player: MatchPlayer;
  highlight: boolean;
  locale: Locale;
}) {
  return (
    <div
      className={
        "flex items-center gap-2 px-2 py-1.5 " + (highlight ? "bg-accent/10" : "")
      }
    >
      {player.heroIcon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.heroIcon}
          alt={player.heroName}
          className="size-8 shrink-0 rounded bg-surface-2 object-cover"
        />
      ) : (
        <span className="size-8 shrink-0 rounded bg-surface-2" />
      )}

      <div className="w-[88px] shrink-0">
        <div
          className={
            "truncate text-xs " +
            (highlight ? "font-bold text-accent" : "font-semibold")
          }
        >
          {player.heroName}
        </div>
        <div className="flex items-center gap-1 text-[10px] tabular-nums text-muted">
          <span>
            {player.kills}/{player.deaths}/{player.assists}
          </span>
          <span>·</span>
          <SoulIcon className="h-2.5 w-auto text-souls" />
          <span>{compactNum(player.netWorth, locale)}</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <ItemBuild items={player.items} compact />
      </div>
    </div>
  );
}

function BuildScore({
  analysis,
  t,
}: {
  analysis: BuildAnalysis;
  t: Dictionary;
}) {
  const color =
    analysis.score >= 75 ? "#69e799" : analysis.score >= 50 ? "#f2e0bf" : "#cc544e";

  return (
    <section className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-extrabold tabular-nums" style={{ color }}>
            {analysis.score}%
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted">
            {t.build.adherence}
          </div>
        </div>

        <p className="min-w-0 flex-1 text-xs text-muted">
          {t.build.comparedTo}{" "}
          <span className="text-ink">
            {analysis.highSkill ? t.build.highSkill : t.build.allPlayers}
          </span>{" "}
          {t.build.sameHero}
          {analysis.enemyNames.length > 0 && (
            <>
              {" "}
              {t.build.against}{" "}
              <span className="text-ink">{analysis.enemyNames.join(" / ")}</span>
            </>
          )}{" "}
          ({t.build.scope[analysis.scope]}).{" "}
          <span className="text-ink">
            {fill(t.build.sampleSize, {
              n: analysis.sampleSize.toLocaleString(),
            })}
          </span>{" "}
          {t.build.analyzed} {t.build.disclaimer}
        </p>
      </div>

      {analysis.swaps.length > 0 && (
        <div className="mt-4 rounded-md border border-accent/30 bg-accent/5 p-3">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-accent">
              {t.build.swapsTitle}
            </h4>
            <span className="text-[11px] text-muted">
              {fill(t.build.swapsDelta, {
                from: analysis.score,
                to: analysis.potentialScore,
              })}
            </span>
          </div>

          <ul className="space-y-1.5">
            {analysis.swaps.map((swap) => (
              <li
                key={swap.out.item.id + "-" + swap.in.item.id}
                className="flex flex-wrap items-center gap-2 text-xs"
              >
                {/* A troca acontece dentro do mesmo tier, então o preço é o mesmo
                    dos dois lados e cabe uma etiqueta só. */}
                {/* 9999 é sentinela para itens fora da loja normal, não um
                    preço — nesse caso mostramos só o tier. */}
                <span className="shrink-0 rounded border border-border bg-bg px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-accent-dim">
                  T{swap.out.item.tier}
                  {swap.out.item.cost > 0 && swap.out.item.cost !== 9999
                    ? " · " + swap.out.item.cost.toLocaleString()
                    : ""}
                </span>
                <SwapItem stat={swap.out} tone="out" />
                <span className="text-muted">→</span>
                <SwapItem stat={swap.in} tone="in" />
              </li>
            ))}
          </ul>

          <p className="mt-2 text-[11px] text-muted">
            {t.build.swapsNote}
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
            {t.build.yourItems}
          </h4>
          <StatHeader t={t} />
          <ul className="space-y-1">
            {analysis.hits.slice(0, 8).map((s) => (
              <StatRow key={s.item.id} stat={s} />
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
            {t.build.candidates}
          </h4>
          {analysis.missing.length > 0 && <StatHeader t={t} />}
          {analysis.missing.length === 0 ? (
            <p className="text-xs text-muted">
              {t.build.allCommonTaken}
            </p>
          ) : (
            <ul className="space-y-1">
              {analysis.missing.map((s) => (
                <StatRow key={s.item.id} stat={s} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/** Item de uma troca sugerida: o que sai (riscado) e o que entra. */
function SwapItem({
  stat,
  tone,
}: {
  stat: BuildAnalysis["hits"][number];
  tone: "out" | "in";
}) {
  const pct = Math.round(stat.pickRate * 100);
  return (
    <span className="inline-flex items-center gap-1.5">
      <ItemHover item={stat.item} className="inline-flex items-center gap-1.5">
        {stat.item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={stat.item.image}
            alt=""
            className={
              "size-5 shrink-0 rounded bg-bg object-contain " +
              (tone === "out" ? "opacity-50 grayscale" : "")
            }
          />
        ) : (
          <span className="size-5 shrink-0 rounded bg-bg" />
        )}
        <span
          className={
            tone === "out" ? "text-muted line-through" : "font-semibold text-ink"
          }
        >
          {stat.item.name}
        </span>
      </ItemHover>
      <span
        className={
          "tabular-nums " + (tone === "out" ? "text-muted" : "text-accent")
        }
      >
        {pct}%
      </span>
    </span>
  );
}

/**
 * Cabeçalho das colunas. Sem ele, os dois percentuais da linha ficam
 * ambíguos — adoção e taxa de vitória são coisas bem diferentes.
 */
function StatHeader({ t }: { t: Dictionary }) {
  return (
    <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted">
      <span className="min-w-0 flex-1" />
      <span
        className="w-[124px] shrink-0 text-right"
        title={t.build.pickRateHelp}
      >
        {t.build.columnPickRate}
      </span>
      <span
        className="w-9 shrink-0 text-right"
        title={t.build.winRateHelp}
      >
        {t.build.columnWinRate}
      </span>
    </div>
  );
}

function StatRow({ stat }: { stat: BuildAnalysis["hits"][number] }) {
  const pct = Math.round(stat.pickRate * 100);
  const wr = Math.round(stat.winRate * 100);

  return (
    <li className="flex items-center gap-2">
      <ItemHover
        item={stat.item}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        {stat.item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={stat.item.image}
            alt=""
            className="size-5 shrink-0 rounded bg-bg object-contain"
          />
        ) : (
          <span className="size-5 shrink-0 rounded bg-bg" />
        )}
        <span className="min-w-0 flex-1 truncate text-xs">
          {stat.item.name}
          <span className="ml-1.5 text-[10px] text-muted tabular-nums">
            T{stat.item.tier}
          </span>
        </span>
      </ItemHover>
      <span className="w-20 shrink-0">
        <span className="block h-1 w-full overflow-hidden rounded bg-surface-2">
          <span
            className="block h-full bg-accent-dim"
            style={{ width: pct + "%" }}
          />
        </span>
      </span>
      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted">
        {pct}%
      </span>
      <span
        className={
          "w-9 shrink-0 text-right text-[11px] tabular-nums " +
          (wr >= 52 ? "text-win" : wr <= 48 ? "text-loss" : "text-muted")
        }
      >
        {wr}%
      </span>
    </li>
  );
}
