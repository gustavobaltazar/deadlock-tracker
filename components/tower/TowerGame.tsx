"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../I18nProvider";
import Fight from "./Fight";
import HpBar from "./HpBar";
import { effectLines, ItemCard, ItemIcon, TIER_SOULS, useLoc } from "./ui";
import {
  afterWin,
  maxHp,
  newRun,
  rollOffer,
  sumStats,
  takeItem,
  weaponDps,
  type Battle,
  type FloorPlan,
  type Run,
} from "@/lib/tower/engine";
import { fill } from "@/lib/i18n";
import type { TowerCatalog, TowerHero } from "@/lib/tower/types";

type Screen = "title" | "roulette" | "map" | "fight" | "loot" | "dead" | "won";

/** Escalada em andamento, salva entre os andares: recarregar não perde a run. */
const RUN_KEY = "torre:v1:run";
const BEST_KEY = "torre:v1:best";

type Saved = { run: Run; screen: "map" | "loot"; dealt: number; taken: number };

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function save(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sem storage a run só não sobrevive a um recarregamento.
  }
}

export default function TowerGame({ catalog }: { catalog: TowerCatalog }) {
  const { t } = useI18n();
  const [screen, setScreen] = useState<Screen>("title");
  const [run, setRun] = useState<Run | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [totals, setTotals] = useState({ dealt: 0, taken: 0 });

  useEffect(() => {
    setSaved(load<Saved>(RUN_KEY));
    setBest(load<number>(BEST_KEY) ?? 0);
  }, []);

  // Salva a run nos pontos de parada (mapa e recompensa).
  useEffect(() => {
    if (run && (screen === "map" || screen === "loot")) {
      save(RUN_KEY, { run, screen, ...totals } satisfies Saved);
    }
  }, [run, screen, totals]);

  function record(floor: number) {
    if (floor > best) {
      setBest(floor);
      setNewBest(true);
      save(BEST_KEY, floor);
    }
  }

  function start() {
    setRun(newRun(catalog));
    setTotals({ dealt: 0, taken: 0 });
    setNewBest(false);
    save(RUN_KEY, null);
    setScreen("roulette");
  }

  function resume() {
    if (!saved) return;
    setRun(saved.run);
    setTotals({ dealt: saved.dealt, taken: saved.taken });
    setNewBest(false);
    setScreen(saved.screen);
  }

  const onFightEnd = useCallback(
    (battle: Battle) => {
      if (!run) return;
      const plan = run.floors[run.floor];
      setTotals((x) => ({ dealt: x.dealt + battle.dealt, taken: x.taken + battle.taken }));
      if (battle.over !== "win") {
        record(plan.floor);
        save(RUN_KEY, null);
        setSaved(null);
        setScreen("dead");
        return;
      }
      const next = afterWin(run, battle);
      if (plan.rewardTier == null) {
        record(plan.floor + 1);
        save(RUN_KEY, null);
        setSaved(null);
        setRun(next);
        setScreen("won");
        return;
      }
      setRun({ ...next, offer: rollOffer(catalog, plan.rewardTier, next.items) });
      setScreen("loot");
    },
    // record usa `best`, lido no momento do fim da luta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, catalog, best],
  );

  function pick(index: number) {
    if (!run) return;
    setRun(takeItem(run, run.offer[index]));
    setScreen("map");
  }

  function reroll() {
    if (!run || run.rerolls <= 0) return;
    const tier = run.floors[run.floor].rewardTier!;
    setRun({ ...run, rerolls: run.rerolls - 1, offer: rollOffer(catalog, tier, run.items, run.offer) });
  }

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-8">
      {screen === "title" && (
        <Title
          best={best}
          saved={saved}
          onStart={start}
          onResume={resume}
          onAbandon={() => {
            save(RUN_KEY, null);
            setSaved(null);
          }}
        />
      )}
      {screen === "roulette" && run && (
        <Roulette heroes={catalog.heroes} hero={run.hero} onDone={() => setScreen("map")} />
      )}
      {screen === "map" && run && <TowerMap run={run} onFight={() => setScreen("fight")} />}
      {screen === "fight" && run && (
        <Fight key={run.floor} run={run} plan={run.floors[run.floor]} onEnd={onFightEnd} />
      )}
      {screen === "loot" && run && <Loot run={run} onPick={pick} onReroll={reroll} />}
      {(screen === "dead" || screen === "won") && run && (
        <EndScreen
          won={screen === "won"}
          run={run}
          totals={totals}
          newBest={newBest}
          onAgain={start}
        />
      )}
      {screen !== "title" && screen !== "fight" && (
        <p className="mt-8 text-center">
          <button onClick={() => setScreen("title")} className="text-xs text-muted hover:text-ink">
            ← {t.tower.title}
          </button>
        </p>
      )}
    </main>
  );
}

function Title({
  best,
  saved,
  onStart,
  onResume,
  onAbandon,
}: {
  best: number;
  saved: Saved | null;
  onStart: () => void;
  onResume: () => void;
  onAbandon: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden rounded-2xl border border-accent-dim/40 px-6 py-10 text-center"
      style={{ background: "radial-gradient(ellipse at 50% 120%, #5a4618 0%, #1c160b 45%, #0b0d09 100%)" }}
    >
      {/* A torre ao fundo: andares empilhados, o topo brilhando. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto flex w-40 flex-col-reverse items-center opacity-25">
        {Array.from({ length: 13 }, (_, i) => (
          <span
            key={i}
            className="mb-1 h-3 rounded-sm bg-accent"
            style={{ width: `${100 - i * 5}%`, opacity: 0.4 + i * 0.05 }}
          />
        ))}
      </div>
      <h1 className="relative text-5xl font-black italic tracking-tight text-souls drop-shadow-[0_0_24px_rgba(255,237,121,0.5)] sm:text-7xl">
        {t.tower.title}
      </h1>
      <p className="relative mx-auto mt-3 max-w-[480px] text-sm text-eggshell">{t.tower.tagline}</p>

      <div className="relative mt-7 flex flex-col items-center gap-2">
        {saved && (
          <>
            <button
              onClick={onResume}
              className="rounded-lg bg-souls px-6 py-3 text-sm font-black text-bg shadow-[0_0_24px_-4px_rgba(255,237,121,0.8)] transition-transform hover:scale-105"
            >
              {fill(t.tower.resume, { n: saved.run.floor + 1 })}
            </button>
            <button onClick={onAbandon} className="text-[11px] text-muted hover:text-loss">
              {t.tower.abandon}
            </button>
          </>
        )}
        <button
          onClick={onStart}
          className={
            "rounded-lg px-6 py-3 text-sm font-black transition-transform hover:scale-105 " +
            (saved
              ? "border border-accent-dim/60 bg-accent/10 text-accent"
              : "bg-souls text-bg shadow-[0_0_24px_-4px_rgba(255,237,121,0.8)]")
          }
        >
          {t.tower.start}
        </button>
        {best > 0 && (
          <p className="text-xs text-muted">
            {best > 13 ? t.tower.bestWin : fill(t.tower.best, { n: best })}
          </p>
        )}
      </div>

      <div className="relative mx-auto mt-8 max-w-[560px] rounded-xl border border-border bg-bg/70 p-4 text-left">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">{t.tower.howTitle}</p>
        <ul className="mt-2 space-y-1.5 text-xs text-eggshell">
          {t.tower.how.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="text-souls">◆</span>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Roleta de retratos que desacelera até parar no herói sorteado. */
function Roulette({ heroes, hero, onDone }: { heroes: TowerHero[]; hero: TowerHero; onDone: () => void }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(heroes[0]);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let delay = 45;
    const spin = () => {
      if (cancelled) return;
      delay *= 1.11;
      if (delay > 380) {
        setShown(hero);
        setLanded(true);
        return;
      }
      setShown(heroes[Math.floor(Math.random() * heroes.length)] ?? hero);
      setTimeout(spin, delay);
    };
    const first = setTimeout(spin, delay);
    return () => {
      cancelled = true;
      clearTimeout(first);
    };
  }, [heroes, hero]);

  return (
    <section className="text-center">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
        {landed ? t.tower.yourHero : t.tower.rolling}
      </p>
      <div className="relative mx-auto mt-4 grid h-72 w-60 place-items-end overflow-hidden rounded-2xl border-2"
        style={{
          borderColor: landed ? hero.color : "rgba(198,162,105,0.5)",
          background: `radial-gradient(circle at 50% 70%, ${shown.color}55, #0b0d0a 75%)`,
          boxShadow: landed ? `0 0 40px -8px ${hero.color}` : undefined,
        }}
      >
        {shown.portrait && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={landed ? "landed" : shown.id}
            src={shown.portrait}
            alt=""
            className={"h-64 w-auto object-contain " + (landed ? "tower-landed" : "")}
          />
        )}
      </div>
      <h2 className="mt-3 text-3xl font-black tracking-tight" style={{ color: shown.color }}>
        {shown.name}
      </h2>
      {landed && <HeroSheet hero={hero} onGo={onDone} />}
    </section>
  );
}

function HeroSheet({ hero, onGo }: { hero: TowerHero; onGo: () => void }) {
  const { t } = useI18n();
  const loc = useLoc();
  return (
    <div className="tower-card mx-auto mt-4 max-w-[560px]">
      <div className="flex justify-center gap-6 text-sm">
        <span>
          {t.tower.health} <b className="text-win">{hero.hp}</b>
        </span>
        <span>
          {t.tower.gun} <b className="text-ink">{Math.round(hero.dps)}</b>
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-left sm:grid-cols-4">
        {hero.abilities.map((a, i) => (
          <div key={a.id} className="rounded-lg border border-border bg-surface p-2">
            <div className="flex items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-md" style={{ background: `${hero.color}55` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {a.image && <img src={a.image} alt="" className="size-6" />}
              </span>
              <span className="text-[11px] font-extrabold leading-tight">
                <span className="text-muted">{i + 1} · </span>
                {loc(a.name)}
              </span>
            </div>
            <ul className="mt-1.5 space-y-0.5 text-[10px] text-eggshell">
              {effectLines(a.effect, 1, t.tower.effects).slice(0, 3).map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <button
        onClick={onGo}
        className="mt-5 rounded-lg bg-souls px-6 py-3 text-sm font-black text-bg shadow-[0_0_24px_-4px_rgba(255,237,121,0.8)] transition-transform hover:scale-105"
      >
        {t.tower.climb} ↑
      </button>
    </div>
  );
}

/** A torre: andares de baixo para cima, chefes escondidos até chegar a vez. */
function TowerMap({ run, onFight }: { run: Run; onFight: () => void }) {
  const { t } = useI18n();
  const loc = useLoc();
  const stats = useMemo(() => sumStats(run.items), [run.items]);
  const max = maxHp(run.hero, stats);
  const floors = [...run.floors].reverse();
  const currentRef = useRef<HTMLLIElement>(null);

  // A torre é desenhada de cima para baixo: rola até o andar da vez.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [run.floor]);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_300px]">
      <ol className="space-y-1.5">
        {floors.map((f) => {
          const index = f.floor - 1;
          const done = index < run.floor;
          const current = index === run.floor;
          const hidden = (f.kind === "boss" || f.kind === "patron") && index > run.floor;
          return (
            <FloorRow
              key={f.floor}
              ref={current ? currentRef : undefined}
              plan={f}
              done={done}
              current={current}
              hidden={hidden}
              label={loc(f.title)}
            />
          );
        })}
      </ol>

      <aside className="space-y-4 md:sticky md:top-4 md:self-start">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            {run.hero.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={run.hero.icon} alt="" className="size-12 rounded-md" style={{ background: `${run.hero.color}44` }} />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-extrabold" style={{ color: run.hero.color }}>
                {run.hero.name}
              </p>
              <HpBar hp={run.hp} max={max} />
            </div>
          </div>
          <div className="mt-3 flex justify-between text-[11px] text-muted">
            <span>
              {t.tower.gun} <b className="text-ink">{Math.round(weaponDps(run.hero, stats))}</b>
            </span>
            <span>
              {t.tower.spirit} <b className="text-[#c99bff]">{Math.round(stats.spirit)}</b>
            </span>
            <span>{fill(t.tower.rerolls, { n: run.rerolls })}</span>
          </div>
          {run.items.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {run.items.map((item) => (
                <span key={item.id} title={loc(item.name)}>
                  <ItemIcon item={item} size={34} />
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onFight}
          className="tower-pulse w-full rounded-lg bg-loss py-3 text-sm font-black uppercase tracking-wider text-white transition-transform hover:scale-[1.02]"
        >
          ⚔ {fill(t.tower.fight, { n: run.floor + 1 })}
        </button>
      </aside>
    </div>
  );
}

function FloorRow({
  ref,
  plan,
  done,
  current,
  hidden,
  label,
}: {
  ref?: React.Ref<HTMLLIElement>;
  plan: FloorPlan;
  done: boolean;
  current: boolean;
  hidden: boolean;
  label: string;
}) {
  const { t } = useI18n();
  const big = plan.kind === "boss" || plan.kind === "patron" || plan.kind === "elite";
  const accent = plan.kind === "patron" ? "#ffed79" : plan.kind === "boss" ? "#e04b3f" : plan.kind === "elite" ? "#e2a33b" : "#5f6a55";
  return (
    <li
      ref={ref}
      className={
        "flex items-center gap-3 rounded-lg border px-3 transition-all " +
        (big ? "py-2.5 " : "py-1.5 ") +
        (current ? "scale-[1.02] bg-surface-2 " : done ? "opacity-45 " : "bg-surface/60 ")
      }
      style={{ borderColor: current ? accent : `${accent}55`, boxShadow: current ? `0 0 22px -8px ${accent}` : undefined }}
    >
      <span className="w-7 text-center text-xs font-black tabular-nums text-muted">{plan.floor}</span>
      <span className="flex -space-x-3">
        {plan.enemies.slice(0, 3).map((e, i) => (
          <span key={i} className={"grid shrink-0 place-items-center overflow-hidden rounded-md bg-black/40 " + (big ? "size-12" : "size-9")}>
            {e.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={e.image}
                alt=""
                className="size-full object-contain"
                style={hidden ? { filter: "brightness(0) drop-shadow(0 0 2px rgba(255,237,121,0.6))" } : undefined}
              />
            )}
          </span>
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold">{hidden ? t.tower.unknown : label}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>
          {t.tower.kinds[plan.kind]}
        </span>
      </span>
      <span className="text-right text-[10px] text-muted">
        {done ? (
          <span className="text-base text-win">✓</span>
        ) : current ? (
          <span className="text-base">⚔</span>
        ) : plan.rewardTier ? (
          `T${plan.rewardTier}`
        ) : (
          "👑"
        )}
      </span>
    </li>
  );
}

function Loot({ run, onPick, onReroll }: { run: Run; onPick: (i: number) => void; onReroll: () => void }) {
  const { locale, t } = useI18n();
  const tier = run.floors[run.floor].rewardTier ?? 1;
  return (
    <section className="text-center">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-souls">{fill(t.tower.lootTier, { n: tier, souls: TIER_SOULS[tier].toLocaleString(locale === "pt" ? "pt-BR" : "en-US") })}</p>
      <h2 className="mt-1 text-3xl font-black tracking-tight">{t.tower.lootTitle}</h2>
      <div className="mt-6 flex flex-wrap items-stretch justify-center gap-4">
        {run.offer.map((item, i) => (
          <ItemCard key={`${item.id}-${run.rerolls}`} item={item} delay={i * 120} onPick={() => onPick(i)} />
        ))}
      </div>
      <button
        onClick={onReroll}
        disabled={run.rerolls <= 0}
        className="mt-6 rounded-lg border border-accent-dim/60 bg-accent/10 px-5 py-2 text-sm font-bold text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
      >
        🎲 {run.rerolls > 0 ? fill(t.tower.reroll, { n: run.rerolls }) : t.tower.noRerolls}
      </button>
    </section>
  );
}

function EndScreen({
  won,
  run,
  totals,
  newBest,
  onAgain,
}: {
  won: boolean;
  run: Run;
  totals: { dealt: number; taken: number };
  newBest: boolean;
  onAgain: () => void;
}) {
  const { locale, t } = useI18n();
  const loc = useLoc();
  const patron = run.floors[run.floors.length - 1].enemies[0];
  const numberLocale = locale === "pt" ? "pt-BR" : "en-US";
  return (
    <section
      className="relative overflow-hidden rounded-2xl border px-6 py-10 text-center"
      style={{
        borderColor: won ? "#ffed79aa" : "#e04b3f88",
        background: won
          ? "radial-gradient(ellipse at 50% 0%, #5a4618 0%, #1c160b 50%, #0b0d09 100%)"
          : "radial-gradient(ellipse at 50% 0%, #4a1a16 0%, #1a0d0b 50%, #0b0909 100%)",
      }}
    >
      {run.hero.portrait && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={run.hero.portrait}
          alt=""
          className={"mx-auto h-48 w-auto " + (won ? "" : "grayscale")}
        />
      )}
      <h2 className={"mt-2 text-4xl font-black italic tracking-tight " + (won ? "text-souls" : "text-loss")}>
        {won ? t.tower.wonTitle : fill(t.tower.deadTitle, { n: run.floor + 1 })}
      </h2>
      {won && (
        <p className="mt-2 text-sm text-eggshell">
          {fill(t.tower.wonBody, { hero: run.hero.name, patron: loc(patron.name) })}
        </p>
      )}
      {newBest && <p className="mt-2 text-sm font-black text-souls">★ {t.tower.newBest}</p>}
      <div className="mt-5 flex justify-center gap-8 text-sm">
        <span>
          {t.tower.damageDealt}
          <b className="block text-2xl text-ink">{Math.round(totals.dealt).toLocaleString(numberLocale)}</b>
        </span>
        <span>
          {t.tower.damageTaken}
          <b className="block text-2xl text-ink">{Math.round(totals.taken).toLocaleString(numberLocale)}</b>
        </span>
      </div>
      {run.items.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">{t.tower.build}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {run.items.map((item) => (
              <span key={item.id} title={loc(item.name)}>
                <ItemIcon item={item} size={40} />
              </span>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={onAgain}
        className="mt-7 rounded-lg bg-souls px-6 py-3 text-sm font-black text-bg shadow-[0_0_24px_-4px_rgba(255,237,121,0.8)] transition-transform hover:scale-105"
      >
        {t.tower.again}
      </button>
    </section>
  );
}
