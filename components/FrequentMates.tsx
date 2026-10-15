import Link from "next/link";
import type { FrequentMate } from "@/lib/api";
import { percent } from "@/lib/format";
import { fill, type Dictionary, type Locale } from "@/lib/i18n";

/** Jogadores com quem a conta mais esteve no mesmo time; cada um leva ao perfil. */
export default function FrequentMates({
  mates,
  locale,
  t,
}: {
  mates: FrequentMate[];
  locale: Locale;
  t: Dictionary;
}) {
  if (mates.length === 0) {
    return <p className="px-3 py-4 text-sm text-muted">{t.player.noMates}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {mates.map((m) => {
        const wr = percent(m.wins, m.matches);
        const name = m.name ?? fill(t.player.unknown, { id: m.accountId });

        return (
          <li key={m.accountId}>
            <Link
              href={`/${locale}/player/${m.accountId}`}
              className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2/60"
            >
              {m.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.avatar}
                  alt=""
                  className="size-9 shrink-0 rounded bg-surface-2 object-cover"
                />
              ) : (
                <span className="size-9 shrink-0 rounded bg-surface-2" />
              )}

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{name}</div>
                <div className="text-[11px] text-muted">
                  {fill(t.player.mateLine, { matches: m.matches })}
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
                  {m.wins}
                  {t.player.winLetter} {m.matches - m.wins}
                  {t.player.lossLetter}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
