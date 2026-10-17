/**
 * Tradução da ficha do jogo para a mecânica da Torre.
 *
 * As habilidades do Deadlock têm propriedades heterogêneas (Damage, DPS,
 * SleepDuration, HealingPerSecond, BonusFireRate...). Em vez de escrever cada
 * uma das ~170 habilidades à mão, o efeito é deduzido pelos nomes das chaves:
 * qualquer habilidade nova do jogo entra funcionando. Sem imports, para rodar
 * também no simulador de balanceamento.
 */
import type {
  AbilityEffect,
  ItemSlot,
  ItemStats,
  Loc,
  TowerAbility,
  TowerHero,
  TowerItem,
} from "./types";

export type RawProps = Record<string, { value?: unknown } | null | undefined>;

export type RawAbility = {
  class_name?: string;
  name?: string;
  image?: string | null;
  image_webp?: string | null;
  properties?: RawProps | null;
};

export type RawItem = {
  id: number;
  class_name?: string;
  name?: string;
  type?: string;
  item_tier?: number | null;
  item_slot_type?: string | null;
  shopable?: boolean;
  disabled?: boolean;
  image?: string | null;
  image_webp?: string | null;
  shop_image?: string | null;
  shop_image_webp?: string | null;
  properties?: RawProps | null;
};

export type RawWeapon = { weapon_info?: { damage_per_second?: number } | null };

export type RawHero = {
  id: number;
  name: string;
  player_selectable?: boolean;
  disabled?: boolean;
  images?: Record<string, string | null>;
  colors?: { style_hex?: string | null };
  items?: Record<string, string> | null;
  starting_stats?: {
    max_health?: { value?: number };
    base_health_regen?: { value?: number };
  };
};

/** Valores numéricos positivos das propriedades, por chave. */
function numbers(props: RawProps | null | undefined): Map<string, number> {
  const out = new Map<string, number>();
  for (const [key, prop] of Object.entries(props ?? {})) {
    const v = Number(prop?.value);
    if (Number.isFinite(v) && v > 0) out.set(key, v);
  }
  return out;
}

/** Maior valor entre as chaves que casam com o padrão (0 se nenhuma). */
function pick(values: Map<string, number>, pattern: RegExp, exclude?: RegExp): number {
  let best = 0;
  for (const [key, v] of values) {
    if (pattern.test(key) && !exclude?.test(key)) best = Math.max(best, v);
  }
  return best;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const round = (v: number, step = 0.1) => Math.round(v / step) * step;

/** Chaves de "dano" que são modificadores, não dano em si. */
const NOT_DAMAGE =
  /Bonus|Percent|Pct|Mult|Threshold|Reduction|Self|Per|Min|Interval|Window|Fixed|Scale|Amp|Penalty|Taken|Health|Spirit|Resist|Falloff|Tooltip|Range|Radius|Speed|Duration|Count|Stack/;

export function parseAbility(
  raw: RawAbility,
  pt: string | undefined,
  slot: number,
): TowerAbility {
  const v = numbers(raw.properties);
  const ultimate = slot === 3;
  const duration = clamp(v.get("AbilityDuration") ?? v.get("BuffDuration") ?? 0, 0, 8);

  const damage = Math.max(
    pick(v, /Damage$/, NOT_DAMAGE),
    // Dano por foguete, por corrente, por golpe: algumas batidas por uso.
    pick(v, /DamagePer(Rocket|Chain|Hit|Shot|Bullet|Tick|Projectile|Strike|Slash)$/) * 6,
  );
  const dps = pick(v, /DPS$/);
  const dotDuration = dps > 0 ? clamp(duration || 3, 2, 6) : 0;

  const stun = clamp(
    pick(v, /^(Stun|Sleep|Immobilize|Toss|Silence|Lift|Petrify|Root|Freeze)Duration$/),
    0,
    2.5,
  );
  const slow =
    clamp(pick(v, /(Slow(Percent|Pct|Amount)?|SlowPct)$/, /Resist|Duration/), 0, 60) / 100;
  const slowDuration = slow > 0 ? clamp(v.get("SlowDuration") ?? v.get("DebuffDuration") ?? 3, 1, 6) : 0;

  const healWindow = duration || 4;
  const heal =
    pick(v, /^Heal(Amount|ing)?$|HealAmount$/) +
    pick(v, /Heal(ing)?PerSecond$/) * healWindow +
    pick(v, /BonusHealthRegen$/) * healWindow;
  const drain = v.has("LifeDrainHealthMult")
    ? 0.8
    : clamp(pick(v, /^HealingFactor$|LifestealPercent/) / 100, 0, 1);
  const barrier = pick(v, /Barrier(Amount|Health)?$|^CombatBarrier$/, /Duration|Percent/);

  const fireRate = clamp(pick(v, /BonusFireRate$/) / 100, 0, 1);
  const weaponBonus = clamp(pick(v, /WeaponDamageBonus|BonusWeaponDamage|WeaponPowerBonus/) / 100, 0, 1);
  const evade = v.has("InvisFadeToDuration") ? clamp(duration || 3, 2, 4) : 0;
  const aoe =
    ultimate || pick(v, /Radius$|AuraRadius|ShockRadius|ExplosionRadius|ExplodeRadius/) > 0;

  const rawCooldown = v.get("AbilityCooldown") ?? (ultimate ? 160 : 30);
  // A Torre é rápida: recargas de 14–50 s viram 4–7,5 s; ultimates, 15–20 s.
  const cooldown = ultimate
    ? clamp(round(9 + rawCooldown * 0.04, 0.5), 12, 22)
    : clamp(round(2.5 + rawCooldown * 0.1, 0.5), 3, 9);

  const effect: AbilityEffect = {
    damage: round(damage, 1),
    dot: round(dps * dotDuration, 1),
    dotDuration,
    heal: round(heal, 1),
    barrier: round(barrier, 1),
    stun: round(stun),
    slow,
    slowDuration,
    fireRate,
    weaponBonus,
    buffDuration: fireRate || weaponBonus ? clamp(duration || 5, 3, 8) : 0,
    evade,
    aoe,
    drain,
  };

  // Habilidade cujo efeito real não cabe na Torre (mobilidade, invocação,
  // utilidade): vira um golpe genérico, para nenhum botão ficar inútil.
  // Cura de poucos pontos é passiva de regeneração (não faz diferença numa luta).
  if (effect.heal < 30) effect.heal = 0;
  const does =
    effect.damage || effect.dot || effect.heal || effect.barrier || effect.stun ||
    effect.fireRate || effect.weaponBonus || effect.evade || effect.drain;
  if (!does) effect.damage = ultimate ? 160 : 70;
  // Dreno sem dano próprio drena de um golpe.
  if (effect.drain && !effect.damage && !effect.dot) effect.damage = ultimate ? 140 : 60;

  // Orçamento: o valor somado da habilidade é proporcional à recarga, para uma
  // habilidade de 3 s não render o mesmo que uma de 9 s. Quem passa é reduzido.
  const value = effect.damage + effect.dot * 0.8 + (effect.heal + effect.barrier) * 0.7;
  const budget = ultimate ? 420 : cooldown * 32;
  if (value > budget) {
    const k = budget / value;
    effect.damage = round(effect.damage * k, 1);
    effect.dot = round(effect.dot * k, 1);
    effect.heal = round(effect.heal * k, 1);
    effect.barrier = round(effect.barrier * k, 1);
  }

  return {
    id: raw.class_name ?? String(slot),
    name: { en: raw.name ?? "?", pt: pt || raw.name || "?" },
    image: raw.image_webp ?? raw.image ?? "",
    cooldown,
    ultimate,
    effect,
  };
}

export function parseHero(
  raw: RawHero,
  weapon: RawWeapon | undefined,
  abilities: TowerAbility[],
): TowerHero | null {
  const dps = weapon?.weapon_info?.damage_per_second ?? 0;
  const hp = raw.starting_stats?.max_health?.value ?? 0;
  if (!dps || !hp || abilities.length !== 4) return null;
  return {
    id: raw.id,
    name: raw.name,
    portrait:
      raw.images?.hero_card_gloat_webp ??
      raw.images?.hero_card_gloat ??
      raw.images?.icon_hero_card_webp ??
      null,
    icon: raw.images?.icon_image_small_webp ?? raw.images?.icon_image_small ?? null,
    color: raw.colors?.style_hex ?? "#c6a269",
    hp,
    dps: round(dps, 0.1),
    regen: raw.starting_stats?.base_health_regen?.value ?? 1,
    abilities,
  };
}

/** Peso de cada tier, pelo preço (800, 1600, 3200, 6400, 9999). */
const TIER_WEIGHT = [0, 1, 2, 4, 7, 10];

export function parseItem(raw: RawItem, pt: string | undefined): TowerItem | null {
  const tier = raw.item_tier ?? 0;
  const slot = raw.item_slot_type as ItemSlot;
  if (raw.type !== "upgrade" || raw.disabled || raw.shopable === false) return null;
  if (tier < 1 || tier > 5 || !["weapon", "vitality", "spirit"].includes(slot)) return null;

  const v = numbers(raw.properties);
  const s: Partial<ItemStats> = {};
  const add = (key: keyof ItemStats, value: number) => {
    if (value > 0) s[key] = round((s[key] ?? 0) + value, 0.001);
  };

  add("hp", v.get("BonusHealth") ?? 0);
  add("weapon", ((v.get("BaseAttackDamagePercent") ?? 0) + (v.get("BonusClipSizePercent") ?? 0) * 0.2) / 100);
  add("fireRate", (v.get("BonusFireRate") ?? 0) / 100);
  add("spirit", (v.get("TechPower") ?? 0) + (v.get("SpiritPower") ?? 0) + (v.get("BonusSpirit") ?? 0));
  add("bulletResist", (v.get("BulletResist") ?? 0) / 100);
  add("spiritResist", (v.get("TechResist") ?? 0) / 100);
  add("lifesteal", (v.get("BulletLifestealPercent") ?? 0) / 100);
  add("spiritLifesteal", (v.get("AbilityLifestealPercentHero") ?? 0) / 100);
  add("cdr", (v.get("CooldownReduction") ?? 0) / 100);
  add("regen", v.get("BonusHealthRegen") ?? 0);
  add("barrier", v.get("CombatBarrier") ?? 0);
  add("crit", (v.get("HeadShotBonusDamage") ?? 0) / 400);
  add("poison", (v.get("DotHealthPercent") ?? 0) / 200);
  if (slot === "spirit") add("burst", v.get("Damage") ?? 0);
  // Bônus contra NPCs: na Torre quase todo inimigo é NPC (menos os chefes),
  // então valem em boa parte.
  add("weapon", ((v.get("NonPlayerBonusWeaponPower") ?? 0) / 100) * 0.6);
  add("bulletResist", ((v.get("NonPlayerBulletResist") ?? 0) / 100) * 0.5);
  // Cura ativa por tempo (Healing Rite) vira regeneração constante, diluída.
  add("regen", (v.get("TotalHealthRegen") ?? 0) / 60);

  // Itens cujo efeito principal é ativo ou situacional quase não têm atributo
  // aproveitável: ganham o atributo típico da categoria, na medida do tier.
  if (Object.keys(s).length < 2) {
    const w = TIER_WEIGHT[tier];
    if (slot === "weapon") add("weapon", 0.06 * w);
    if (slot === "vitality") add("hp", 75 * w);
    if (slot === "spirit") add("spirit", 7 * w);
  }

  return {
    id: raw.id,
    name: { en: raw.name ?? "?", pt: pt || raw.name || "?" } satisfies Loc,
    image: raw.shop_image_webp ?? raw.shop_image ?? raw.image_webp ?? raw.image ?? null,
    tier,
    slot,
    stats: s,
  };
}
