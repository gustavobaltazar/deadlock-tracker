/**
 * Motor da Torre: plano dos andares, combate em tempo real e recompensas.
 *
 * O combate é simulado em passos (`step`) de poucos milissegundos: o herói
 * atira sozinho no alvo, os inimigos atiram de volta, e as habilidades — do
 * jogador, por clique, e dos chefes, por IA — entram por cima. Tudo aqui é
 * puro (sem React, sem DOM, só `import type`), para a mesma lógica rodar no
 * navegador e no simulador de balanceamento.
 */
import type {
  AbilityEffect,
  ItemStats,
  Loc,
  TowerAbility,
  TowerCatalog,
  TowerHero,
  TowerItem,
} from "./types";

const NPC = "https://assets-bucket.deadlock-api.com/assets-api-res/images/npcs/";

// ───────────────────────────── Andares ─────────────────────────────

export type EnemyKind = "trooper" | "mob" | "elite" | "boss" | "patron";

export type EnemyAbility = {
  name: Loc;
  image: string | null;
  cooldown: number;
  ultimate: boolean;
  effect: AbilityEffect;
};

export type EnemySpec = {
  name: Loc;
  image: string | null;
  color: string;
  hp: number;
  dps: number;
  abilities: EnemyAbility[];
  /** Herói por trás do chefe, para o retrato e a cor. */
  heroId?: number;
  /** Resistência a controle: fração do atordoamento que de fato pega. */
  tenacity: number;
};

export type FloorPlan = {
  floor: number;
  act: number;
  kind: EnemyKind;
  title: Loc;
  enemies: EnemySpec[];
  /** Tier dos itens oferecidos ao vencer (null no último andar). */
  rewardTier: number | null;
};

const effect = (e: Partial<AbilityEffect>): AbilityEffect => ({
  damage: 0, dot: 0, dotDuration: 0, heal: 0, barrier: 0, stun: 0, slow: 0,
  slowDuration: 0, fireRate: 0, weaponBonus: 0, buffDuration: 0, evade: 0,
  aoe: false, drain: 0, ...e,
});

type Family = { name: Loc; weak?: string; normal?: string; strong?: string };

/** Monstros da jungle, com a arte de cada nível que a API tem. */
const JUNGLE: Family[] = [
  { name: { en: "Snapvine", pt: "Planta Carnívora" }, weak: "neutral_plant_weak", normal: "neutral_plant_normal", strong: "neutral_plant_heavy" },
  { name: { en: "Drain Creature", pt: "Criatura Drenadora" }, weak: "neutral_drain_creature_weak", normal: "neutral_drain_creature_normal", strong: "neutral_drain_creature_strong" },
  { name: { en: "Grimoire", pt: "Grimório" }, weak: "neutral_book_weak", normal: "neutral_book_normal" },
  { name: { en: "Lantern", pt: "Lanterna" }, normal: "neutral_lantern_normal", strong: "neutral_lantern_strong" },
  { name: { en: "Shroom", pt: "Cogumelo" }, normal: "neutral_mushroom_normal", strong: "neutral_mushroom_heavy" },
  { name: { en: "Specimen", pt: "Espécime" }, weak: "neutral_specimen_weak", normal: "neutral_specimen_normal" },
  { name: { en: "Tunnel Lurker", pt: "Espreitador do Túnel" }, normal: "neutral_underground_normal", strong: "neutral_underground_heavy" },
  { name: { en: "Stagehand", pt: "Marionete" }, normal: "neutral_stagehand_normal", strong: "neutral_stagehand_heavy" },
  { name: { en: "Barrel", pt: "Barril" }, normal: "neutral_barrel_normal", strong: "neutral_barrel_heavy" },
];

/**
 * Dificuldade de cada andar (índice = andar; 0 não é usado): multiplica a
 * vida e o dano dos inimigos, que têm todos uma base parecida. Os valores
 * saíram do simulador de balanceamento, calibrado para um bom jogador ter
 * ~1% de risco nos primeiros andares, ~5% nos acampamentos, ~10% nas elites,
 * ~15% nos chefes e ~30% no Patrono. Os dois primeiros andares foram
 * aliviados à mão: são o aquecimento, não devem deixar o herói a perigo.
 */
export const FLOOR_HP = [0, 1.4, 1.5, 1.11, 2.55, 1.81, 1.93, 4.48, 2.66, 3.43, 8.48, 6.19, 6.2, 7.71];
export const FLOOR_DPS = [0, 0.95, 1.2, 0.91, 2.03, 1.38, 1.38, 3.26, 1.93, 2.28, 5.76, 3.98, 3.8, 4.17];

/** Vida e dano somados de um grupo comum, divididos entre os membros. */
const GROUP = { hp: 1250, dps: 26 };

function mob(level: "weak" | "normal" | "strong", floor: number, rng: () => number, count: number): EnemySpec[] {
  const families = JUNGLE.filter((f) => f[level]);
  const family = families[Math.floor(rng() * families.length)];
  return Array.from({ length: count }, () => ({
    name: family.name,
    image: `${NPC}neutrals/${family[level]}.png`,
    color: "#7fae5a",
    hp: Math.round((GROUP.hp / count) * FLOOR_HP[floor]),
    dps: (GROUP.dps / count) * FLOOR_DPS[floor],
    abilities: [],
    tenacity: 1,
  }));
}

function troopers(floor: number): EnemySpec[] {
  return Array.from({ length: 3 }, () => ({
    name: { en: "Trooper", pt: "Tropa" },
    image: `${NPC}trooper.png`,
    color: "#d0563f",
    hp: Math.round((GROUP.hp / 3) * FLOOR_HP[floor]),
    dps: (GROUP.dps / 3) * FLOOR_DPS[floor],
    abilities: [],
    tenacity: 1,
  }));
}

/** Objetivos do mapa como elites: cada um com um golpe próprio. */
const ELITES: Record<number, { name: Loc; image: string; hp: number; dps: number; ability: EnemyAbility }> = {
  2: {
    name: { en: "Guardian", pt: "Guardião" },
    image: `${NPC}tier_1_boss.png`,
    hp: 1500,
    dps: 22,
    ability: {
      name: { en: "Ground Slam", pt: "Pancada no Chão" },
      image: null,
      cooldown: 8,
      ultimate: false,
      effect: effect({ damage: 90, stun: 0.8 }),
    },
  },
  3: {
    name: { en: "Walker", pt: "Walker" },
    image: `${NPC}tier_2_boss.png`,
    hp: 1500,
    dps: 22,
    ability: {
      name: { en: "Orbital Laser", pt: "Laser Orbital" },
      image: null,
      cooldown: 9,
      ultimate: false,
      effect: effect({ damage: 70, dot: 110, dotDuration: 4 }),
    },
  },
  4: {
    name: { en: "Shrine", pt: "Santuário" },
    image: `${NPC}tier_3_boss.png`,
    hp: 1500,
    dps: 22,
    ability: {
      name: { en: "Spirit Barrier", pt: "Barreira Espiritual" },
      image: null,
      cooldown: 10,
      ultimate: false,
      effect: effect({ barrier: 220, damage: 70 }),
    },
  },
};

function elite(act: number, floor: number): EnemySpec[] {
  const e = ELITES[act];
  return [
    {
      name: e.name,
      image: e.image,
      color: "#e2a33b",
      hp: Math.round(e.hp * FLOOR_HP[floor]),
      dps: e.dps * FLOOR_DPS[floor],
      abilities: [{ ...e.ability, effect: scaleEffect(e.ability.effect, FLOOR_DPS[floor]) }],
      tenacity: 0.6,
    },
  ];
}

/** Vida e dano de um herói chefe, em múltiplos da ficha dele. */
const BOSS_HP = 2;
const BOSS_DPS = 0.45;
const BOSS_COOLDOWN = 1.6;

function bossFromHero(hero: TowerHero, floor: number): EnemySpec {
  return {
    name: { en: hero.name, pt: hero.name },
    image: hero.portrait,
    color: hero.color,
    heroId: hero.id,
    hp: Math.round(hero.hp * BOSS_HP * FLOOR_HP[floor]),
    dps: hero.dps * BOSS_DPS * FLOOR_DPS[floor],
    abilities: hero.abilities.map((a) => ({
      name: a.name,
      image: a.image,
      cooldown: a.cooldown * BOSS_COOLDOWN,
      ultimate: a.ultimate,
      effect: scaleEffect(a.effect, FLOOR_DPS[floor] * 0.75),
    })),
    tenacity: 0.5,
  };
}

const PATRONS: { name: Loc; image: string }[] = [
  { name: { en: "The Hidden King", pt: "O Rei Oculto" }, image: `${NPC}patron_hiddenking.png` },
  { name: { en: "The Archmother", pt: "A Arquimãe" }, image: `${NPC}patron_archmother.png` },
];

function patron(which: number, floor: number): EnemySpec {
  const p = PATRONS[which % PATRONS.length];
  const k = FLOOR_DPS[floor] * 0.75;
  return {
    name: p.name,
    image: p.image,
    color: which % 2 ? "#7fd3e0" : "#e0a35a",
    hp: Math.round(1900 * FLOOR_HP[floor]),
    dps: 24 * FLOOR_DPS[floor],
    abilities: [
      {
        name: { en: "Patron's Wrath", pt: "Ira do Patrono" },
        image: null,
        cooldown: 7,
        ultimate: false,
        effect: scaleEffect(effect({ damage: 110, stun: 0.6 }), k),
      },
      {
        name: { en: "Soul Siphon", pt: "Sifão de Almas" },
        image: null,
        cooldown: 11,
        ultimate: false,
        effect: scaleEffect(effect({ dot: 260, dotDuration: 5, heal: 400 }), k),
      },
      {
        name: { en: "Final Judgement", pt: "Julgamento Final" },
        image: null,
        cooldown: 20,
        ultimate: true,
        effect: scaleEffect(effect({ damage: 300, slow: 0.4, slowDuration: 4 }), k),
      },
    ],
    tenacity: 0.35,
  };
}

function scaleEffect(e: AbilityEffect, k: number): AbilityEffect {
  return { ...e, damage: e.damage * k, dot: e.dot * k, heal: e.heal * k, barrier: e.barrier * k };
}

export const FLOORS = 13;

/** Monta a torre: 4 atos de 3 andares (comuns, elite ou tropas, chefe) e o Patrono. */
export function planTower(bosses: TowerHero[], patronIndex: number, rng: () => number): FloorPlan[] {
  const plan: FloorPlan[] = [];
  const push = (kind: EnemyKind, act: number, enemies: EnemySpec[], title: Loc, rewardTier: number | null) =>
    plan.push({ floor: plan.length + 1, act, kind, enemies, title, rewardTier });

  for (let act = 1; act <= 4; act++) {
    if (act === 1) {
      push("trooper", 1, troopers(1), { en: "The Lane", pt: "A Rota" }, 1);
      const camp = mob("weak", 2, rng, 2);
      push("mob", 1, camp, camp[0].name, 1);
    } else {
      const level = act === 2 ? "normal" : "strong";
      const floor = plan.length + 1;
      const camp = mob(level, floor, rng, act === 4 ? 3 : 2);
      push("mob", act, camp, camp[0].name, act);
      push("elite", act, elite(act, floor + 1), ELITES[act].name, act);
    }
    const boss = bosses[act - 1];
    push("boss", act, [bossFromHero(boss, plan.length + 1)], { en: boss.name, pt: boss.name }, act + 1);
  }
  const final = patron(patronIndex, plan.length + 1);
  push("patron", 5, [final], final.name, null);
  return plan;
}

// ───────────────────────────── Atributos ─────────────────────────────

export const EMPTY_STATS: ItemStats = {
  hp: 0, weapon: 0, fireRate: 0, spirit: 0, bulletResist: 0, spiritResist: 0,
  lifesteal: 0, spiritLifesteal: 0, cdr: 0, regen: 0, barrier: 0, crit: 0,
  poison: 0, burst: 0,
};

/**
 * Soma dos itens. Resistências e redução de recarga combinam com retorno
 * decrescente, como no jogo: duas de 30% dão 51%, não 60%.
 */
export function sumStats(items: TowerItem[]): ItemStats {
  const s = { ...EMPTY_STATS };
  let bulletKeep = 1;
  let spiritKeep = 1;
  let cdKeep = 1;
  for (const item of items) {
    for (const [key, value] of Object.entries(item.stats) as [keyof ItemStats, number][]) {
      if (key === "bulletResist") bulletKeep *= 1 - value;
      else if (key === "spiritResist") spiritKeep *= 1 - value;
      else if (key === "cdr") cdKeep *= 1 - value;
      else s[key] += value;
    }
  }
  s.bulletResist = Math.min(1 - bulletKeep, 0.7);
  s.spiritResist = Math.min(1 - spiritKeep, 0.7);
  s.cdr = Math.min(1 - cdKeep, 0.5);
  return s;
}

/** Multiplicador das habilidades pelo poder espiritual. */
export const spiritPower = (spirit: number) => 1 + spirit / 60;

export function maxHp(hero: TowerHero, stats: ItemStats) {
  return Math.round(hero.hp + stats.hp);
}

export function weaponDps(hero: TowerHero, stats: ItemStats, bonus = { weapon: 0, fireRate: 0 }) {
  return hero.dps * (1 + stats.weapon + bonus.weapon) * (1 + stats.fireRate + bonus.fireRate);
}

// ───────────────────────────── Combate ─────────────────────────────

export type FxKind = "weapon" | "crit" | "spirit" | "heal" | "barrier" | "miss" | "dot";

export type Fx = {
  id: number;
  /** "player" ou o índice do inimigo. */
  target: "player" | number;
  amount: number;
  kind: FxKind;
  t: number;
};

/** Anúncio de habilidade usada, mostrado no centro da arena. */
export type Cast = {
  id: number;
  side: "player" | number;
  name: Loc;
  image: string | null;
  ultimate: boolean;
  t: number;
};

export type Unit = {
  maxHp: number;
  hp: number;
  barrier: number;
  dps: number;
  stunUntil: number;
  slow: number;
  slowUntil: number;
  /** Efeitos de dano contínuo: dano por segundo até o instante `until`. */
  dots: { perSec: number; until: number }[];
  /** Último instante em que levou dano (para o tremor da arte). */
  hitAt: number;
  dead: boolean;
};

export type EnemyUnit = Unit & {
  spec: EnemySpec;
  readyAt: number[];
  ultUsed: boolean;
  buffUntil: number;
  buff: number;
  evadeUntil: number;
};

export type Battle = {
  t: number;
  hero: TowerHero;
  stats: ItemStats;
  player: Unit;
  playerReady: number[];
  buffs: { weapon: number; fireRate: number; until: number }[];
  evadeUntil: number;
  enemies: EnemyUnit[];
  target: number;
  fx: Fx[];
  casts: Cast[];
  over: null | "win" | "lose";
  /** Acúmulo de dano entre um "tiro" exibido e o próximo. */
  pendingShot: number;
  nextShot: number;
  pendingIncoming: number[];
  nextIncoming: number;
  /** Totais da luta, para o resumo. */
  dealt: number;
  taken: number;
  seq: number;
};

/** Intervalo entre os números de dano exibidos (o dano em si é contínuo). */
const SHOT_EVERY = 0.32;
const INCOMING_EVERY = 0.5;
const BASE_CRIT = 0.08;
const CRIT_MULT = 1.65;
/** Atordoamento máximo que um inimigo pode aplicar no jogador. */
const MAX_PLAYER_STUN = 1.2;

function unit(hp: number, dps: number): Unit {
  return { maxHp: hp, hp, barrier: 0, dps, stunUntil: 0, slow: 0, slowUntil: 0, dots: [], hitAt: -1, dead: false };
}

export function startBattle(hero: TowerHero, items: TowerItem[], hp: number, floor: FloorPlan): Battle {
  const stats = sumStats(items);
  const player = unit(maxHp(hero, stats), 0);
  player.hp = Math.min(hp, player.maxHp);
  player.barrier = stats.barrier;
  return {
    t: 0,
    hero,
    stats,
    player,
    // As habilidades começam prontas: a luta abre com tudo na mão.
    playerReady: hero.abilities.map(() => 0),
    buffs: [],
    evadeUntil: 0,
    enemies: floor.enemies.map((spec) => ({
      ...unit(spec.hp, spec.dps),
      spec,
      // Chefes esperam um pouco antes da primeira habilidade, e não todas juntas.
      readyAt: spec.abilities.map((a, i) => (a.ultimate ? 0 : 2.5 + i * 1.7)),
      ultUsed: false,
      buffUntil: 0,
      buff: 0,
      evadeUntil: 0,
    })),
    target: 0,
    fx: [],
    casts: [],
    over: null,
    pendingShot: 0,
    nextShot: SHOT_EVERY,
    pendingIncoming: floor.enemies.map(() => 0),
    nextIncoming: INCOMING_EVERY,
    dealt: 0,
    taken: 0,
    seq: 0,
  };
}

function fx(b: Battle, target: "player" | number, amount: number, kind: FxKind) {
  b.fx.push({ id: ++b.seq, target, amount: Math.round(amount), kind, t: b.t });
}

/**
 * Dano num alvo, barreira primeiro. Devolve o dano efetivo. `flash` marca o
 * golpe para o tremor da arte; dano contínuo não marca, senão o alvo piscaria
 * sem parar.
 */
function hurt(b: Battle, u: Unit, amount: number, flash = true): number {
  if (u.dead || amount <= 0) return 0;
  let left = amount;
  if (u.barrier > 0) {
    const absorbed = Math.min(u.barrier, left);
    u.barrier -= absorbed;
    left -= absorbed;
  }
  const dealt = Math.min(u.hp, left);
  u.hp -= dealt;
  if (flash) u.hitAt = b.t;
  if (u.hp <= 0.5) {
    u.hp = 0;
    u.dead = true;
  }
  return amount;
}

function healPlayer(b: Battle, amount: number, show = true) {
  const p = b.player;
  if (p.dead || amount <= 0) return;
  const real = Math.min(p.maxHp - p.hp, amount);
  p.hp += real;
  if (show && real >= 1) fx(b, "player", real, "heal");
}

const alive = (b: Battle) => b.enemies.filter((e) => !e.dead);

function retarget(b: Battle) {
  if (!b.enemies[b.target] || b.enemies[b.target].dead) {
    const next = b.enemies.findIndex((e) => !e.dead);
    if (next >= 0) b.target = next;
  }
}

export function setTarget(b: Battle, index: number) {
  if (b.enemies[index] && !b.enemies[index].dead) b.target = index;
}

/** Recarga efetiva de uma habilidade do jogador. */
export function playerCooldown(b: Battle, i: number) {
  return b.hero.abilities[i].cooldown * (1 - b.stats.cdr);
}

/** Usa a habilidade `i` do jogador. Devolve se foi usada. */
export function castPlayer(b: Battle, i: number): boolean {
  const ability: TowerAbility | undefined = b.hero.abilities[i];
  if (!ability || b.over || b.t < b.playerReady[i] || b.t < b.player.stunUntil) return false;
  const e = ability.effect;
  const power = spiritPower(b.stats.spirit);
  retarget(b);

  const targets = e.aoe ? b.enemies.filter((x) => !x.dead) : [b.enemies[b.target]].filter((x) => x && !x.dead);
  let spiritDealt = 0;
  targets.forEach((enemy) => {
    const index = b.enemies.indexOf(enemy);
    const burst = e.damage * power + (targets.length && enemy === targets[0] ? b.stats.burst * power : 0);
    if (burst > 0 && enemy.evadeUntil <= b.t) {
      spiritDealt += hurt(b, enemy, burst);
      fx(b, index, burst, "spirit");
    }
    if (e.dot > 0) enemy.dots.push({ perSec: (e.dot * power) / e.dotDuration, until: b.t + e.dotDuration });
    if (e.stun > 0) enemy.stunUntil = Math.max(enemy.stunUntil, b.t + e.stun * enemy.spec.tenacity);
    if (e.slow > 0) {
      enemy.slow = Math.max(enemy.slow, e.slow);
      enemy.slowUntil = Math.max(enemy.slowUntil, b.t + e.slowDuration);
    }
  });

  b.dealt += spiritDealt;
  if (e.heal > 0) healPlayer(b, e.heal * power);
  if (e.barrier > 0) {
    b.player.barrier += e.barrier * power;
    fx(b, "player", e.barrier * power, "barrier");
  }
  if (e.fireRate || e.weaponBonus) {
    b.buffs.push({ weapon: e.weaponBonus, fireRate: e.fireRate, until: b.t + e.buffDuration });
  }
  if (e.evade > 0) b.evadeUntil = Math.max(b.evadeUntil, b.t + e.evade);
  const drain = spiritDealt * (e.drain + b.stats.spiritLifesteal);
  if (drain > 0) healPlayer(b, drain);

  b.playerReady[i] = b.t + playerCooldown(b, i);
  b.casts.push({ id: ++b.seq, side: "player", name: ability.name, image: ability.image, ultimate: ability.ultimate, t: b.t });
  retarget(b);
  checkOver(b);
  return true;
}

function castEnemy(b: Battle, index: number, a: EnemyAbility) {
  const enemy = b.enemies[index];
  const e = a.effect;
  const p = b.player;
  const resist = 1 - b.stats.spiritResist;
  const evading = b.evadeUntil > b.t;

  if (e.damage > 0) {
    if (evading && !a.ultimate) fx(b, "player", 0, "miss");
    else {
      b.taken += hurt(b, p, e.damage * resist);
      fx(b, "player", e.damage * resist, "spirit");
    }
  }
  if (e.dot > 0) p.dots.push({ perSec: (e.dot * resist) / e.dotDuration, until: b.t + e.dotDuration });
  if (e.stun > 0 && !evading) p.stunUntil = Math.max(p.stunUntil, b.t + Math.min(e.stun, MAX_PLAYER_STUN));
  if (e.slow > 0) {
    p.slow = Math.max(p.slow, Math.min(e.slow, 0.5));
    p.slowUntil = Math.max(p.slowUntil, b.t + e.slowDuration);
  }
  if (e.heal > 0) {
    const real = Math.min(enemy.maxHp - enemy.hp, Math.min(e.heal, enemy.maxHp * 0.15));
    enemy.hp += real;
    if (real >= 1) fx(b, index, real, "heal");
  }
  if (e.barrier > 0) {
    enemy.barrier += Math.min(e.barrier, enemy.maxHp * 0.2);
    fx(b, index, e.barrier, "barrier");
  }
  if (e.fireRate || e.weaponBonus) {
    enemy.buff = e.fireRate + e.weaponBonus;
    enemy.buffUntil = b.t + e.buffDuration;
  }
  if (e.evade > 0) enemy.evadeUntil = b.t + Math.min(e.evade, 2.5);
  if (e.drain > 0 && e.damage > 0) {
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + e.damage * e.drain * 0.5);
  }
  b.casts.push({ id: ++b.seq, side: index, name: a.name, image: a.image, ultimate: a.ultimate, t: b.t });
}

function checkOver(b: Battle) {
  if (b.over) return;
  if (b.player.dead) b.over = "lose";
  else if (b.enemies.every((e) => e.dead)) b.over = "win";
}

function tickDots(b: Battle, u: Unit, dt: number, target: "player" | number) {
  u.dots = u.dots.filter((d) => d.until > b.t);
  let total = 0;
  for (const d of u.dots) total += d.perSec * dt;
  if (total > 0) {
    hurt(b, u, total, false);
    if (target === "player") b.taken += total;
    else b.dealt += total;
  }
}

/** Avança a luta em `dt` segundos. */
export function step(b: Battle, dt: number) {
  if (b.over) return;
  b.t += dt;
  const p = b.player;
  const s = b.stats;

  // Regeneração do herói.
  healPlayer(b, (b.hero.regen + s.regen) * dt, false);

  // Dano contínuo.
  tickDots(b, p, dt, "player");
  b.enemies.forEach((e, i) => !e.dead && tickDots(b, e, dt, i));

  // Arma do jogador: dano contínuo no alvo, mostrado em "tiros".
  retarget(b);
  const target = b.enemies[b.target];
  b.buffs = b.buffs.filter((x) => x.until > b.t);
  if (target && !target.dead && p.stunUntil <= b.t) {
    const bonus = b.buffs.reduce(
      (acc, x) => ({ weapon: acc.weapon + x.weapon, fireRate: acc.fireRate + x.fireRate }),
      { weapon: 0, fireRate: 0 },
    );
    const slowed = p.slowUntil > b.t ? 1 - p.slow : 1;
    b.pendingShot += weaponDps(b.hero, s, bonus) * slowed * dt;
    if (s.poison > 0) b.pendingShot += target.maxHp * s.poison * dt;
  }
  if (b.t >= b.nextShot) {
    b.nextShot = b.t + SHOT_EVERY;
    if (target && !target.dead && b.pendingShot > 0) {
      if (target.evadeUntil > b.t) fx(b, b.target, 0, "miss");
      else {
        const crit = Math.random() < BASE_CRIT + s.crit;
        const amount = b.pendingShot * (crit ? CRIT_MULT : 1);
        b.dealt += hurt(b, target, amount);
        fx(b, b.target, amount, crit ? "crit" : "weapon");
        if (s.lifesteal > 0) healPlayer(b, amount * s.lifesteal, false);
      }
    }
    b.pendingShot = 0;
  }

  // Inimigos: tiro contínuo, mostrado de tempos em tempos, e habilidades.
  b.enemies.forEach((e, i) => {
    if (e.dead || e.stunUntil > b.t) return;
    const slowed = e.slowUntil > b.t ? 1 - e.slow : 1;
    const buffed = e.buffUntil > b.t ? 1 + e.buff : 1;
    b.pendingIncoming[i] += e.dps * slowed * buffed * dt;

    e.spec.abilities.forEach((a, k) => {
      if (b.t < e.readyAt[k]) return;
      // A ultimate do chefe é guardada para quando ele estiver apanhando.
      if (a.ultimate) {
        if (e.ultUsed && b.t < e.readyAt[k]) return;
        if (!e.ultUsed && e.hp > e.maxHp * 0.6) return;
        e.ultUsed = true;
      }
      castEnemy(b, i, a);
      e.readyAt[k] = b.t + a.cooldown * (0.85 + Math.random() * 0.3);
    });
  });
  if (b.t >= b.nextIncoming) {
    b.nextIncoming = b.t + INCOMING_EVERY;
    b.enemies.forEach((e, i) => {
      const amount = b.pendingIncoming[i];
      b.pendingIncoming[i] = 0;
      if (amount <= 0 || e.dead) return;
      if (b.evadeUntil > b.t) return fx(b, "player", 0, "miss");
      const real = amount * (1 - s.bulletResist);
      b.taken += hurt(b, p, real);
      fx(b, "player", real, "weapon");
    });
  }

  // Limpa efeitos visuais antigos.
  if (b.fx.length > 60) b.fx = b.fx.slice(-40);
  b.fx = b.fx.filter((f) => b.t - f.t < 1.1);
  b.casts = b.casts.filter((c) => b.t - c.t < 1.6);

  retarget(b);
  checkOver(b);
}

// ───────────────────────────── Escalada ─────────────────────────────

export type Run = {
  hero: TowerHero;
  floors: FloorPlan[];
  /** Índice do próximo andar a enfrentar (0 = andar 1). */
  floor: number;
  items: TowerItem[];
  hp: number;
  rerolls: number;
  offer: TowerItem[];
};

export const START_REROLLS = 2;
/** Cura entre andares, em fração da vida máxima; depois de chefe, mais. */
export const HEAL_AFTER_FIGHT = 0.3;
export const HEAL_AFTER_BOSS = 0.6;

export function shuffle<T>(list: T[], rng: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function newRun(catalog: TowerCatalog, rng: () => number = Math.random): Run {
  const [hero, ...rest] = shuffle(catalog.heroes, rng);
  const bosses = rest.slice(0, 4);
  return {
    hero,
    floors: planTower(bosses, Math.floor(rng() * 2), rng),
    floor: 0,
    items: [],
    hp: hero.hp,
    rerolls: START_REROLLS,
    offer: [],
  };
}

/** Três itens do tier pedido, sem repetir o que o jogador já tem nem `avoid`. */
export function rollOffer(
  catalog: TowerCatalog,
  tier: number,
  owned: TowerItem[],
  avoid: TowerItem[] = [],
  rng: () => number = Math.random,
): TowerItem[] {
  const taken = new Set([...owned, ...avoid].map((i) => i.id));
  let pool = catalog.items.filter((i) => i.tier === tier && !taken.has(i.id));
  if (pool.length < 3) pool = catalog.items.filter((i) => i.tier === tier && !owned.some((o) => o.id === i.id));
  // Uma carta de cada categoria quando dá: arma, vitalidade e espírito.
  const bySlot = (slot: string) => shuffle(pool.filter((i) => i.slot === slot), rng)[0];
  const picks = [bySlot("weapon"), bySlot("vitality"), bySlot("spirit")].filter(Boolean) as TowerItem[];
  for (const extra of shuffle(pool, rng)) {
    if (picks.length >= 3) break;
    if (!picks.includes(extra)) picks.push(extra);
  }
  return shuffle(picks.slice(0, 3), rng);
}

/** Depois de vencer: guarda a vida que sobrou e cura um pouco para o próximo. */
export function afterWin(run: Run, battle: Battle): Run {
  const plan = run.floors[run.floor];
  const max = battle.player.maxHp;
  const heal = (plan.kind === "boss" || plan.kind === "elite" ? HEAL_AFTER_BOSS : HEAL_AFTER_FIGHT) * max;
  return {
    ...run,
    hp: Math.min(max, battle.player.hp + heal),
    rerolls: run.rerolls + (plan.kind === "boss" ? 1 : 0),
  };
}

/** Pega o item escolhido e sobe um andar. A vida máxima nova entra cheia. */
export function takeItem(run: Run, item: TowerItem): Run {
  const before = maxHp(run.hero, sumStats(run.items));
  const items = [...run.items, item];
  const after = maxHp(run.hero, sumStats(items));
  return { ...run, items, hp: run.hp + (after - before), floor: run.floor + 1, offer: [] };
}
