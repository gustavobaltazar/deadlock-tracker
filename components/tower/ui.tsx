"use client";

import { useI18n } from "../I18nProvider";
import { fill, type Dictionary } from "@/lib/i18n";
import type { AbilityEffect, ItemSlot, ItemStats, Loc, TowerItem } from "@/lib/tower/types";

/** Cores das categorias, as mesmas da loja do jogo. */
export const SLOT_COLOR: Record<ItemSlot, string> = {
  weapon: "#e7883c",
  vitality: "#7cc85a",
  spirit: "#b67cf2",
};

/** Preço de cada tier em almas, como na loja. */
export const TIER_SOULS = [0, 800, 1600, 3200, 6400, 9999];

export function useLoc() {
  const { locale } = useI18n();
  return (text: Loc | string) => (typeof text === "string" ? text : locale === "pt" ? text.pt : text.en);
}

const pct = (v: number) => Math.round(v * 100);
const one = (v: number) => Math.round(v * 10) / 10;

/** Linhas de efeito de uma habilidade, na ordem em que importam. */
export function effectLines(e: AbilityEffect, power: number, t: Dictionary["tower"]["effects"]) {
  const lines: string[] = [];
  if (e.damage) lines.push(fill(t.damage, { n: Math.round(e.damage * power) }));
  if (e.dot) lines.push(fill(t.dot, { n: Math.round(e.dot * power), s: one(e.dotDuration) }));
  if (e.heal) lines.push(fill(t.heal, { n: Math.round(e.heal * power) }));
  if (e.barrier) lines.push(fill(t.barrier, { n: Math.round(e.barrier * power) }));
  if (e.stun) lines.push(fill(t.stun, { s: one(e.stun) }));
  if (e.slow) lines.push(fill(t.slow, { p: pct(e.slow) }));
  if (e.fireRate) lines.push(fill(t.fireRate, { p: pct(e.fireRate) }));
  if (e.weaponBonus) lines.push(fill(t.weaponBonus, { p: pct(e.weaponBonus) }));
  if (e.evade) lines.push(fill(t.evade, { s: one(e.evade) }));
  if (e.drain) lines.push(fill(t.drain, { p: pct(e.drain) }));
  if (e.aoe) lines.push(t.aoe);
  return lines;
}

const STAT_ORDER: (keyof ItemStats)[] = [
  "weapon", "fireRate", "crit", "poison", "lifesteal", "spirit", "burst", "cdr",
  "spiritLifesteal", "hp", "barrier", "regen", "bulletResist", "spiritResist",
];

export function statLines(stats: Partial<ItemStats>, t: Dictionary["tower"]["stats"]) {
  return STAT_ORDER.filter((k) => stats[k]).map((k) => {
    const v = stats[k]!;
    const isPct = !["hp", "spirit", "regen", "barrier", "burst"].includes(k);
    return fill(t[k], isPct ? { p: k === "poison" ? one(v * 100) : pct(v) } : { n: Math.round(v) });
  });
}

/** Ícone de item no formato da loja: quadrado com a cor da categoria. */
export function ItemIcon({ item, size = 40 }: { item: TowerItem; size?: number }) {
  const color = SLOT_COLOR[item.slot];
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-md border"
      style={{
        width: size,
        height: size,
        borderColor: `${color}aa`,
        background: `radial-gradient(circle at 50% 35%, ${color}55, ${color}18 70%)`,
      }}
    >
      {item.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image} alt="" className="size-[78%] object-contain drop-shadow" draggable={false} />
      )}
      <span
        className="absolute -bottom-1 -right-1 rounded-sm px-0.5 text-[8px] font-black leading-tight text-bg"
        style={{ background: color }}
      >
        T{item.tier}
      </span>
    </span>
  );
}

/** Carta de recompensa. */
export function ItemCard({
  item,
  onPick,
  delay = 0,
}: {
  item: TowerItem;
  onPick: () => void;
  delay?: number;
}) {
  const { t } = useI18n();
  const loc = useLoc();
  const color = SLOT_COLOR[item.slot];
  return (
    <button
      onClick={onPick}
      className="tower-card group relative flex w-full max-w-[230px] flex-col overflow-hidden rounded-xl border-2 bg-surface text-left transition-transform hover:-translate-y-1.5"
      style={{
        borderColor: `${color}99`,
        boxShadow: `0 0 26px -10px ${color}`,
        animationDelay: `${delay}ms`,
      }}
    >
      <span
        className="relative grid h-32 place-items-center"
        style={{ background: `radial-gradient(circle at 50% 45%, ${color}55, ${color}10 70%)` }}
      >
        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            draggable={false}
            className="size-20 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-110"
          />
        )}
        <span
          className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-black text-bg"
          style={{ background: color }}
        >
          T{item.tier}
        </span>
      </span>
      <span className="flex flex-1 flex-col px-3 pb-3 pt-2">
        <span className="text-sm font-extrabold leading-tight">{loc(item.name)}</span>
        <ul className="mt-2 flex-1 space-y-1 text-xs text-eggshell">
          {statLines(item.stats, t.tower.stats).map((line) => (
            <li key={line} className="flex gap-1.5">
              <span style={{ color }}>◆</span>
              {line}
            </li>
          ))}
        </ul>
        <span
          className="mt-3 rounded-md py-1.5 text-center text-xs font-extrabold text-bg transition-colors"
          style={{ background: color }}
        >
          {t.tower.pick}
        </span>
      </span>
    </button>
  );
}
