import { notFound } from "next/navigation";
import HeroStatsList from "@/components/HeroStatsList";
import DataFreshness from "@/components/DataFreshness";
import MatchList from "@/components/MatchList";
import PlayerHeader from "@/components/PlayerHeader";
import RankCard from "@/components/RankCard";
import SearchBar from "@/components/SearchBar";
import {
  getHeroMap,
  getHeroStats,
  getItemMap,
  getMatchItems,
  getRankAssets,
  getMatchHistory,
  getProfile,
  getRank,
  isWin,
  pickSignatureHero,
  toMatchViews,
} from "@/lib/api";
import { kda, percent } from "@/lib/format";
import { fill, getDictionary, isLocale, type Locale } from "@/lib/i18n";

const RECENT_COUNT = 20;

/** Título por jogador, para links compartilhados identificarem o perfil. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; accountId: string }>;
}) {
  const { locale, accountId } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "en");
  const id = Number(accountId);
  if (!Number.isInteger(id) || id <= 0) return {};

  const profile = await getProfile(id);
  const nome = profile?.personaname ?? fill(t.player.unknown, { id });
  return {
    title: nome,
    description: fill(t.site.description, {}) + ` — ${nome}`,
    alternates: {
      canonical: `/${locale}/player/${id}`,
      languages: {
        en: `/en/player/${id}`,
        "pt-BR": `/pt/player/${id}`,
      },
    },
  };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ locale: string; accountId: string }>;
}) {
  const { locale: rawLocale, accountId } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const t = getDictionary(locale);
  const id = Number(accountId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [profile, matches, rank, heroStats, heroes, itemCatalog, rankAssets] =
    await Promise.all([
      getProfile(id),
      getMatchHistory(id),
      getRank(id),
      getHeroStats(id),
      getHeroMap(),
      getItemMap(),
      getRankAssets(),
    ]);

  if (!profile && matches.length === 0) notFound();

  const recent = matches.slice(0, RECENT_COUNT);
  // Uma única chamada em lote cobre as builds de todas as partidas exibidas.
  const builds = await getMatchItems(
    id,
    recent.map((m) => m.match_id),
    itemCatalog,
  );
  const wins = recent.filter(isWin).length;
  const losses = recent.length - wins;
  const totals = recent.reduce(
    (acc, m) => ({
      k: acc.k + m.player_kills,
      d: acc.d + m.player_deaths,
      a: acc.a + m.player_assists,
    }),
    { k: 0, d: 0, a: 0 },
  );
  const signature = pickSignatureHero(heroStats);
  const topHeroes = [...heroStats]
    .sort((a, b) => b.matches_played - a.matches_played)
    .slice(0, 8);

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <div className="mb-6 max-w-[560px]">
        <SearchBar />
      </div>

      <PlayerHeader
        accountId={id}
        profile={profile}
        signature={signature}
        signatureHero={signature ? heroes.get(signature.hero_id) : undefined}
        locale={locale}
        t={t}
      />

      <div className="mb-5">
        <DataFreshness lastMatchTime={matches[0]?.start_time ?? null} t={t} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Coluna esquerda */}
        <div className="space-y-5">
          <RankCard rank={rank} placeholder={rankAssets.get(0)} t={t} />

          <section className="rounded-lg border border-border bg-surface">
            <h2 className="border-b border-border px-3 py-2.5 text-sm font-bold">
              {fill(t.player.recentTitle, { n: recent.length })}
            </h2>
            <div className="flex items-center gap-4 px-3 py-4">
              <div className="flex-1">
                <div className="text-sm text-muted">
                  <span className="font-semibold text-win">
                    {wins}
                    {t.player.winLetter}
                  </span>{" "}
                  <span className="font-semibold text-loss">
                    {losses}
                    {t.player.lossLetter}
                  </span>
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {percent(wins, recent.length)}%
                </div>
                <div className="text-xs text-muted">{t.player.winRate}</div>
              </div>
              <div className="flex-1 border-l border-border pl-4">
                <div className="text-sm tabular-nums">
                  {(totals.k / Math.max(1, recent.length)).toFixed(1)} /{" "}
                  <span className="text-loss">
                    {(totals.d / Math.max(1, recent.length)).toFixed(1)}
                  </span>{" "}
                  / {(totals.a / Math.max(1, recent.length)).toFixed(1)}
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {kda(totals.k, totals.d, totals.a, t)}
                </div>
                <div className="text-xs text-muted">{t.player.avgKda}</div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface">
            <h2 className="border-b border-border px-3 py-2.5 text-sm font-bold">
              {t.player.topHeroes}
            </h2>
            <HeroStatsList stats={topHeroes} heroes={heroes} t={t} />
          </section>
        </div>

        {/* Coluna direita: histórico */}
        <section className="rounded-lg border border-border bg-surface">
          <h2 className="border-b border-border px-3 py-2.5 text-sm font-bold">
            {t.player.matchHistory}
            <span className="ml-2 text-xs font-normal text-muted">
              {fill(t.player.recorded, { n: matches.length })}
            </span>
          </h2>
          <MatchList
            accountId={id}
            initialMatches={toMatchViews(recent, heroes, builds)}
            total={matches.length}
          />
        </section>
      </div>
    </main>
  );
}
