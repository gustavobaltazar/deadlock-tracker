import type { Hero, PlayerHeroStats } from "@/lib/api";
import { percent } from "@/lib/format";

export default function HeroStatsList({
  stats,
  heroes,
}: {
  stats: PlayerHeroStats[];
  heroes: Map<number, Hero>;
}) {
  if (stats.length === 0) {
    return <p className="px-3 py-4 text-sm text-muted">Sem dados de heróis.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {stats.map((s) => {
        const hero = heroes.get(s.hero_id);
        const wr = percent(s.wins, s.matches_played);
        const avgKda =
          s.deaths === 0 ? "—" : ((s.kills + s.assists) / s.deaths).toFixed(2);

        return (
          <li key={s.hero_id} className="flex items-center gap-3 px-3 py-2.5">
            {hero?.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero.icon}
                alt={hero.name}
                className="size-9 shrink-0 rounded bg-surface-2 object-cover"
              />
            ) : (
              <span className="size-9 shrink-0 rounded bg-surface-2" />
            )}

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {hero?.name ?? `Herói ${s.hero_id}`}
              </div>
              <div className="text-[11px] text-muted">
                {s.matches_played} jogos · {avgKda} KDA
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div
                className={`text-sm font-semibold tabular-nums ${
                  wr >= 50 ? "text-win" : "text-loss"
                }`}
              >
                {wr}%
              </div>
              <div className="text-[11px] text-muted tabular-nums">
                {s.wins}V {s.matches_played - s.wins}D
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
