import { notFound } from "next/navigation";
import ActivityHeatmap, { type ActivityGame } from "@/components/ActivityHeatmap";
import BestMatch from "@/components/BestMatch";
import HeroStatsList from "@/components/HeroStatsList";
import DataFreshness from "@/components/DataFreshness";
import FrequentMates from "@/components/FrequentMates";
import MatchList from "@/components/MatchList";
import PlayerHeader from "@/components/PlayerHeader";
import RankCard from "@/components/RankCard";
import SearchBar from "@/components/SearchBar";
import {
  getHeroMap,
  getHeroStats,
  getItemMap,
  getFrequentMates,
  findBestMatch,
  getMatchItems,
  getRankAssets,
  getMatchHistory,
  getProfile,
  getRank,
  isWin,
  parseAccountId,
  pickSignatureHero,
  summarizeMvps,
  toMatchViews,
} from "@/lib/api";
import { kda, percent } from "@/lib/format";
import { fill, getDictionary, isLocale, type Locale } from "@/lib/i18n";

const RECENT_COUNT = 20;
/** Semanas do mapa de atividade: 20 colunas cabem na coluna lateral. */
const ACTIVITY_WEEKS = 20;

/** Título por jogador, para links compartilhados identificarem o perfil. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; accountId: string }>;
}) {
  const { locale, accountId } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "en");
  const id = parseAccountId(accountId);
  if (id == null) return {};

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
  const id = parseAccountId(accountId);
  if (id == null) notFound();

  const [
    profile,
    matches,
    rank,
    heroStats,
    heroes,
    itemCatalog,
    rankAssets,
    mates,
  ] = await Promise.all([
    getProfile(id),
    getMatchHistory(id),
    getRank(id),
    getHeroStats(id),
    getHeroMap(),
    getItemMap(),
    getRankAssets(),
    getFrequentMates(id),
  ]);

  if (!profile && matches.length === 0) notFound();

  const recent = matches.slice(0, RECENT_COUNT);

  const [builds, best] = await Promise.all([
    // Uma única chamada em lote cobre as builds de todas as partidas exibidas.
    getMatchItems(
      id,
      recent.map((m) => m.match_id),
      itemCatalog,
    ),
    findBestMatch(id, matches, itemCatalog),
  ]);
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
  const mvps = summarizeMvps(heroStats);
  const topHeroes = [...heroStats]
    .sort((a, b) => b.matches_played - a.matches_played)
    .slice(0, 8);
  // Só a janela do mapa viaja para o cliente, reduzida a [início, venceu]. Um
  // dia a mais de folga cobre a diferença entre o fuso do servidor e o do
  // visitante, que é quem decide em que dia cada partida cai.
  const activityFrom = Date.now() / 1000 - (ACTIVITY_WEEKS * 7 + 1) * 86400;
  const activity: ActivityGame[] = matches
    .filter((m) => m.start_time >= activityFrom)
    .map((m) => [m.start_time, isWin(m)]);

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
        mvps={mvps}
        mvpHero={mvps?.topHero ? heroes.get(mvps.topHero.heroId) : undefined}
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

          <section className="rounded-lg border border-border bg-surface">
            <h2 className="border-b border-border px-3 py-2.5 text-sm font-bold">
              {t.player.activity}
              <span className="ml-2 text-xs font-normal text-muted">
                {fill(t.player.activityRange, { n: ACTIVITY_WEEKS })}
              </span>
            </h2>
            <ActivityHeatmap games={activity} weeks={ACTIVITY_WEEKS} />
          </section>

          <section className="rounded-lg border border-border bg-surface">
            <h2 className="border-b border-border px-3 py-2.5 text-sm font-bold">
              {t.player.mates}
            </h2>
            <FrequentMates mates={mates} locale={locale} t={t} />
          </section>
        </div>

        {/* Coluna direita: melhor partida e histórico.
            `min-w-0` é necessário: itens de grid nascem com `min-width: auto`, então a
            coluna 1fr não encolheria abaixo da largura do conteúdo e vazaria para
            fora do container, desalinhando com o cabeçalho do perfil. */}
        <div className="min-w-0 space-y-5">
          {best && (
            <BestMatch
              match={best.match}
              highlights={best.highlights}
              hero={heroes.get(best.match.hero_id)}
              total={matches.length}
              locale={locale}
              t={t}
            />
          )}

          <section className="min-w-0 rounded-lg border border-border bg-surface">
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
      </div>
    </main>
  );
}
