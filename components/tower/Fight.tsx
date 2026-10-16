"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "../I18nProvider";
import HpBar from "./HpBar";
import { effectLines, ItemIcon, useLoc } from "./ui";
import {
  castPlayer,
  playerCooldown,
  setTarget,
  spiritPower,
  startBattle,
  step,
  weaponDps,
  type Battle,
  type EnemyUnit,
  type FloorPlan,
  type Fx,
  type Run,
} from "@/lib/tower/engine";
import { fill } from "@/lib/i18n";

type Phase = "intro" | "go" | "fight" | "end";

/** Fundo de cada ato: rua, crepúsculo, catacumba, inferno e o topo dourado. */
const ACT_BG = [
  "",
  "radial-gradient(ellipse at 50% 110%, #2c3a24 0%, #141a10 55%, #0b0d09 100%)",
  "radial-gradient(ellipse at 50% 110%, #24344a 0%, #111a26 55%, #090c12 100%)",
  "radial-gradient(ellipse at 50% 110%, #3a2448 0%, #1a1024 55%, #0c0910 100%)",
  "radial-gradient(ellipse at 50% 110%, #4a2020 0%, #241010 55%, #120808 100%)",
  "radial-gradient(ellipse at 50% 110%, #5a4618 0%, #2a2010 50%, #0e0b05 100%)",
];

export default function Fight({
  run,
  plan,
  onEnd,
}: {
  run: Run;
  plan: FloorPlan;
  onEnd: (battle: Battle) => void;
}) {
  const { t } = useI18n();
  const loc = useLoc();
  const [battle] = useState(() => startBattle(run.hero, run.items, run.hp, plan));
  const [phase, setPhase] = useState<Phase>("intro");
  const [, setFrame] = useState(0);
  const ended = useRef(false);

  // Sequência de abertura: VS, "LUTE!", luta.
  useEffect(() => {
    const a = setTimeout(() => setPhase("go"), 2100);
    const b = setTimeout(() => setPhase("fight"), 2900);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  // Laço da luta: um passo do motor por quadro.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (phase === "fight") {
        step(battle, dt);
        if (battle.over && !ended.current) {
          ended.current = true;
          setPhase("end");
          setTimeout(() => onEnd(battle), 1900);
        }
      }
      setFrame((f) => (f + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, battle, onEnd]);

  // Teclado: 1–4 usam habilidades, Tab troca de alvo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "fight") return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) castPlayer(battle, n - 1);
      if (e.key === "Tab") {
        e.preventDefault();
        const alive = battle.enemies.map((x, i) => (x.dead ? -1 : i)).filter((i) => i >= 0);
        const next = alive[(alive.indexOf(battle.target) + 1) % alive.length];
        if (next != null) setTarget(battle, next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, battle]);

  const b = battle;
  const hero = run.hero;
  const stunned = b.player.stunUntil > b.t;
  const evading = b.evadeUntil > b.t;
  const buffed = b.buffs.length > 0;
  const lastCast = b.casts[b.casts.length - 1];
  const single = b.enemies.length === 1;
  const enemyLabel = plan.enemies[0].name;

  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-2xl border border-border"
        style={{ background: ACT_BG[plan.act] }}
      >
        {/* Faixa do andar. */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-3 text-[11px] font-bold uppercase tracking-widest">
          <span className="text-accent">{fill(t.tower.floor, { n: plan.floor })}</span>
          <span className={plan.kind === "boss" || plan.kind === "patron" ? "text-loss" : "text-muted"}>
            {t.tower.kinds[plan.kind]} · {loc(plan.title)}
          </span>
        </div>

        <div className="relative grid min-h-[360px] grid-cols-2 items-end gap-2 px-3 pb-4 sm:min-h-[400px] sm:px-6">
          {/* Jogador */}
          <div className={"relative flex flex-col items-center " + (phase === "intro" ? "tower-slide-left" : "")}>
            <FxLayer fx={b.fx} target="player" now={b.t} incoming />
            <Portrait
              src={hero.portrait}
              color={hero.color}
              hitAge={b.t - b.player.hitAt}
              className={
                "h-52 sm:h-64 " +
                (stunned ? "grayscale " : "") +
                (evading ? "opacity-40 " : "") +
                (b.player.dead ? "tower-dead " : "")
              }
            />
            {stunned && (
              <span className="absolute top-1/3 rounded bg-black/70 px-2 py-0.5 text-xs font-black tracking-widest text-souls">
                💫 {t.tower.stunned}
              </span>
            )}
            <div className="relative z-10 -mt-4 w-full max-w-[260px]">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-extrabold" style={{ color: hero.color }}>
                  {hero.name}
                </span>
                <span className="flex gap-1 text-xs">
                  {buffed && <span title="buff">⚡</span>}
                  {evading && <span title="evade">👻</span>}
                  {b.player.slowUntil > b.t && <span title="slow">🐌</span>}
                  {b.player.dots.length > 0 && <span title="dot">🔥</span>}
                </span>
              </div>
              <HpBar hp={b.player.hp} max={b.player.maxHp} barrier={b.player.barrier} size="lg" />
            </div>
          </div>

          {/* Inimigos */}
          <div className={"flex items-end justify-center gap-1 sm:gap-3 " + (phase === "intro" ? "tower-slide-right" : "")}>
            {b.enemies.map((enemy, i) => (
              <EnemyCard
                key={i}
                enemy={enemy}
                index={i}
                battle={b}
                single={single}
                targeted={b.target === i && !single}
                onClick={() => setTarget(b, i)}
              />
            ))}
          </div>

          {/* Habilidade recém-usada, no centro. */}
          {lastCast && phase === "fight" && (
            <div
              key={lastCast.id}
              className="tower-cast pointer-events-none absolute left-1/2 top-6 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-black/75 py-1 pl-1 pr-3"
              style={{
                borderColor:
                  lastCast.side === "player" ? `${hero.color}aa` : `${b.enemies[lastCast.side as number]?.spec.color ?? "#e04b3f"}aa`,
              }}
            >
              <span
                className="grid size-7 place-items-center rounded-full"
                style={{ background: lastCast.side === "player" ? hero.color : "#7c2a25" }}
              >
                {lastCast.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={lastCast.image} alt="" className="size-5" />
                ) : (
                  <span className="text-sm">✦</span>
                )}
              </span>
              <span className={"whitespace-nowrap text-xs font-extrabold " + (lastCast.ultimate ? "text-souls" : "text-ink")}>
                {lastCast.side === "player" ? "" : `${loc(b.enemies[lastCast.side as number].spec.name)} · `}
                {loc(lastCast.name)}
              </span>
            </div>
          )}
        </div>

        {/* Abertura: VS e "LUTE!" */}
        {phase === "intro" && (
          <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
            <div className="tower-vs text-center">
              <div className="text-7xl font-black italic tracking-tighter text-souls drop-shadow-[0_0_24px_rgba(255,237,121,0.8)] sm:text-8xl">
                {t.tower.vs}
              </div>
              <div className="mt-2 text-sm font-bold uppercase tracking-[0.3em] text-eggshell">
                {hero.name} · {loc(enemyLabel)}
              </div>
            </div>
          </div>
        )}
        {phase === "go" && (
          <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-black/30">
            <div className="tower-go text-6xl font-black italic tracking-tight text-loss drop-shadow-[0_0_30px_rgba(224,75,63,0.9)] sm:text-8xl">
              {t.tower.go}
            </div>
          </div>
        )}
        {phase === "end" && (
          <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-black/50">
            <div
              className={
                "tower-go text-6xl font-black italic tracking-tight sm:text-8xl " +
                (b.over === "win"
                  ? "text-souls drop-shadow-[0_0_30px_rgba(255,237,121,0.9)]"
                  : "text-loss drop-shadow-[0_0_30px_rgba(224,75,63,0.9)]")
              }
            >
              {b.over === "win" ? t.tower.victory : t.tower.defeat}
            </div>
          </div>
        )}
      </div>

      <AbilityBar battle={b} disabled={phase !== "fight"} />
      <StatsStrip run={run} battle={b} />
      {!single && <p className="text-center text-[11px] text-muted">{t.tower.target}</p>}
    </div>
  );
}

/** Arte de um combatente, com tremor e clarão vermelho ao apanhar. */
function Portrait({
  src,
  color,
  hitAge,
  mirror,
  className,
}: {
  src: string | null;
  color: string;
  hitAge: number;
  mirror?: boolean;
  className?: string;
}) {
  const shaking = hitAge >= 0 && hitAge < 0.18;
  const dx = shaking ? Math.sin(hitAge * 90) * 5 : 0;
  return (
    <div className="relative flex justify-center">
      <span
        className="absolute bottom-0 h-1/2 w-3/4 rounded-full blur-2xl"
        style={{ background: `${color}55` }}
      />
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          draggable={false}
          className={"relative w-auto select-none object-contain transition-[filter,opacity] duration-300 " + (className ?? "")}
          style={{
            transform: `translateX(${dx}px) ${mirror ? "scaleX(-1)" : ""}`,
            filter: shaking ? "brightness(1.6) sepia(1) hue-rotate(-50deg) saturate(4)" : undefined,
          }}
        />
      )}
    </div>
  );
}

function EnemyCard({
  enemy,
  index,
  battle,
  single,
  targeted,
  onClick,
}: {
  enemy: EnemyUnit;
  index: number;
  battle: Battle;
  single: boolean;
  targeted: boolean;
  onClick: () => void;
}) {
  const loc = useLoc();
  const { t } = useI18n();
  const spec = enemy.spec;
  const isHero = spec.heroId != null;
  const stunned = enemy.stunUntil > battle.t && !enemy.dead;
  const size = single ? (isHero ? "h-52 sm:h-64" : "h-44 sm:h-56") : "h-24 sm:h-32";

  return (
    <button
      onClick={onClick}
      disabled={enemy.dead}
      className={
        "relative flex min-w-0 flex-1 flex-col items-center rounded-lg pt-4 transition-colors " +
        (single ? "max-w-[300px]" : "max-w-[150px] cursor-crosshair") +
        (targeted ? " bg-white/5" : "")
      }
    >
      {targeted && <span className="absolute top-0 text-xs text-loss">▼</span>}
      <FxLayer fx={battle.fx} target={index} now={battle.t} />
      <Portrait
        src={spec.image}
        color={spec.color}
        hitAge={battle.t - enemy.hitAt}
        mirror={isHero}
        className={size + (stunned ? " grayscale" : "") + (enemy.dead ? " tower-dead" : "")}
      />
      {stunned && (
        <span className="absolute top-1/3 rounded bg-black/70 px-1.5 text-[10px] font-black text-souls">
          💫 {single ? t.tower.stunned : ""}
        </span>
      )}
      <div className="relative z-10 -mt-3 w-full">
        <div className="mb-1 flex items-center justify-between gap-1">
          <span className="truncate text-xs font-extrabold" style={{ color: spec.color }}>
            {loc(spec.name)}
          </span>
          <span className="text-[10px]">
            {enemy.dots.length > 0 && "🔥"}
            {enemy.slowUntil > battle.t && "🐌"}
          </span>
        </div>
        <HpBar
          hp={enemy.hp}
          max={enemy.maxHp}
          barrier={enemy.barrier}
          color="#e04b3f"
          size={single ? "lg" : "md"}
          showText={single}
        />
      </div>
    </button>
  );
}

const FX_STYLE: Record<Fx["kind"], string> = {
  weapon: "text-lg text-white",
  crit: "text-2xl text-souls",
  spirit: "text-xl text-[#c99bff]",
  heal: "text-lg text-win",
  barrier: "text-lg text-[#bcd0ff]",
  dot: "text-sm text-[#ff9d4a]",
  miss: "text-sm text-muted",
};

/** Números flutuantes sobre um combatente. */
function FxLayer({
  fx,
  target,
  now,
  incoming,
}: {
  fx: Fx[];
  target: "player" | number;
  now: number;
  incoming?: boolean;
}) {
  const { locale } = useI18n();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[20%] z-20 h-0">
      {fx
        .filter((f) => f.target === target && now - f.t < 1.1)
        .map((f) => {
          const offset = ((f.id * 37) % 70) - 35;
          const hurtColor = incoming && (f.kind === "weapon" || f.kind === "crit") ? "text-lg text-[#ff6b5e]" : FX_STYLE[f.kind];
          return (
            <span
              key={f.id}
              className={"tower-float absolute font-black tabular-nums [text-shadow:0_2px_4px_#000] " + hurtColor}
              style={{ left: `calc(50% + ${offset}px)` }}
            >
              {f.kind === "miss"
                ? locale === "pt" ? "ERROU" : "MISS"
                : `${f.kind === "heal" || f.kind === "barrier" ? "+" : ""}${f.amount}${f.kind === "crit" ? "!" : ""}`}
            </span>
          );
        })}
    </div>
  );
}

/** Barra das quatro habilidades, com a recarga girando sobre o ícone. */
function AbilityBar({ battle, disabled }: { battle: Battle; disabled: boolean }) {
  const { t } = useI18n();
  const loc = useLoc();
  const hero = battle.hero;
  const power = spiritPower(battle.stats.spirit);
  const stunned = battle.player.stunUntil > battle.t;

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {hero.abilities.map((a, i) => {
        const left = Math.max(0, battle.playerReady[i] - battle.t);
        const total = playerCooldown(battle, i);
        const ready = left <= 0 && !disabled && !stunned;
        const frac = total > 0 ? left / total : 0;
        return (
          <div key={a.id} className="group relative">
            <button
              onClick={() => castPlayer(battle, i)}
              disabled={!ready}
              aria-label={loc(a.name)}
              className={
                "relative grid size-16 place-items-center overflow-hidden rounded-xl border-2 transition-transform sm:size-[72px] " +
                (ready ? "hover:-translate-y-0.5 active:scale-95" : "")
              }
              style={{
                borderColor: a.ultimate ? "#ffed79" : `${hero.color}cc`,
                background: `radial-gradient(circle at 50% 35%, ${hero.color}66, #0b0d0a 75%)`,
                boxShadow: ready ? `0 0 18px -4px ${a.ultimate ? "#ffed79" : hero.color}` : undefined,
              }}
            >
              {a.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.image} alt="" className="size-10 select-none" draggable={false} />
              )}
              {frac > 0 && (
                <span
                  className="absolute inset-0 grid place-items-center text-lg font-black text-white"
                  style={{
                    background: `conic-gradient(rgba(0,0,0,0.78) ${frac * 360}deg, rgba(0,0,0,0.25) 0deg)`,
                  }}
                >
                  {left.toFixed(left < 1 ? 1 : 0)}
                </span>
              )}
              <span className="absolute left-1 top-0.5 text-[10px] font-black text-white/80">{i + 1}</span>
            </button>

            {/* Ficha da habilidade no hover. */}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden w-52 -translate-x-1/2 rounded-lg border border-border bg-bg/95 p-2.5 text-left shadow-xl group-hover:block">
              <p className="text-xs font-extrabold">
                {loc(a.name)}
                {a.ultimate && <span className="ml-1 text-[10px] text-souls">· {t.tower.ult}</span>}
              </p>
              <ul className="mt-1 space-y-0.5 text-[11px] text-eggshell">
                {effectLines(a.effect, power, t.tower.effects).map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
              <p className="mt-1 text-[10px] text-muted">
                {fill(t.tower.effects.cooldown, { s: Math.round(total * 10) / 10 })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatsStrip({ run, battle }: { run: Run; battle: Battle }) {
  const { t } = useI18n();
  const s = battle.stats;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted">
      <span>
        {t.tower.gun}: <b className="text-ink">{Math.round(weaponDps(run.hero, s))}</b>
      </span>
      <span>
        {t.tower.spirit}: <b className="text-[#c99bff]">{Math.round(s.spirit)}</b>
      </span>
      {run.items.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {run.items.map((item) => (
            <ItemIcon key={item.id} item={item} size={26} />
          ))}
        </span>
      )}
    </div>
  );
}
