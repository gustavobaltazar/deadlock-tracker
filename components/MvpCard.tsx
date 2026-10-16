import StarIcon from "./StarIcon";
import type { Hero, MvpSummary } from "@/lib/api";
import { percent } from "@/lib/format";
import { fill, type Dictionary } from "@/lib/i18n";

/** Dourado das almas (gold_color), o mesmo dos destaques da melhor partida. */
const GOLD = "#ffed79";

/**
 * Total de MVPs do jogador, no topo da coluna lateral. Borda e brilho
 * dourados o separam dos demais cartões, que são neutros.
 */
export default function MvpCard({
  mvps,
  hero,
  t,
}: {
  mvps: MvpSummary;
  /** Herói com mais MVPs do jogador. */
  hero: Hero | undefined;
  t: Dictionary;
}) {
  return (
    <section
      className="relative cursor-help overflow-hidden rounded-lg border bg-surface"
      style={{
        borderColor: `${GOLD}55`,
        boxShadow: `0 0 28px -12px ${GOLD}66`,
      }}
      title={fill(t.player.mvpSince, { n: mvps.rated })}
    >
      {/* Brilho suave atrás da medalha. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 15% 50%, ${GOLD}1f, transparent 55%)`,
        }}
      />

      <div className="relative flex items-center gap-4 px-4 py-4">
        <div
          className="grid size-14 shrink-0 place-items-center rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${GOLD}, #c6a269 60%, #92703c)`,
            boxShadow: `0 0 16px ${GOLD}66`,
          }}
        >
          <StarIcon className="size-8 text-bg drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]" />
        </div>

        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-4xl font-extrabold leading-none tabular-nums"
              style={{ color: GOLD, textShadow: `0 0 12px ${GOLD}55` }}
            >
              {mvps.mvp}
            </span>
            <span className="text-sm font-bold uppercase tracking-widest text-accent">
              {t.player.mvps}
            </span>
          </div>
          <div className="mt-1.5 text-xs text-eggshell">
            {fill(t.player.mvpRate, { pct: percent(mvps.mvp, mvps.rated) })}
          </div>
          <div className="text-xs text-muted">
            {fill(t.player.mvpKeyPlayer, { n: mvps.keyPlayer })}
          </div>
        </div>
      </div>

      {mvps.topHero && hero && (
        <div className="relative flex items-center gap-1.5 border-t border-border px-4 py-2 text-xs text-muted">
          {t.player.mvpTopHero}
          {hero.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.icon} alt="" className="size-5 rounded-sm" />
          )}
          <span
            className="font-semibold"
            style={{ color: hero.styleHex ?? undefined }}
          >
            {hero.name}
          </span>
          <span className="ml-auto font-semibold tabular-nums" style={{ color: GOLD }}>
            {mvps.topHero.count}×
          </span>
        </div>
      )}
    </section>
  );
}
