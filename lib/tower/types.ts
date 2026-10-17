/**
 * Tipos da Torre, o roguelike do SEARCHLOCK: um herói sorteado sobe andar por
 * andar enfrentando monstros da jungle, objetivos do mapa e outros heróis,
 * montando a build com itens de verdade do jogo.
 *
 * Este arquivo não importa nada: é compartilhado entre o servidor (que monta
 * o catálogo a partir da Deadlock API) e o navegador (que roda o combate).
 */

/** Texto nos dois idiomas do site. */
export type Loc = { en: string; pt: string };

/**
 * O que uma habilidade faz no combate, já traduzido da ficha do jogo para a
 * mecânica simplificada da Torre. Valores de dano são os de base; o poder
 * espiritual do herói multiplica na hora do uso.
 */
export type AbilityEffect = {
  /** Dano imediato. */
  damage: number;
  /** Dano contínuo total, espalhado por `dotDuration` segundos. */
  dot: number;
  dotDuration: number;
  /** Cura imediata no herói. */
  heal: number;
  /** Barreira: vida extra que absorve dano primeiro. */
  barrier: number;
  /** Segundos em que o alvo fica sem agir. */
  stun: number;
  /** Fração do dano do alvo cortada pela lentidão, e por quanto tempo. */
  slow: number;
  slowDuration: number;
  /** Bônus temporário de cadência e de dano de arma (frações), e duração. */
  fireRate: number;
  weaponBonus: number;
  buffDuration: number;
  /** Segundos em que o herói desvia de todos os tiros (invisibilidade). */
  evade: number;
  /** Atinge todos os inimigos, não só o alvo. */
  aoe: boolean;
  /** Fração do dano causado que volta como cura. */
  drain: number;
};

export type TowerAbility = {
  id: string;
  name: Loc;
  image: string;
  /** Recarga já ajustada ao ritmo da Torre, em segundos. */
  cooldown: number;
  ultimate: boolean;
  effect: AbilityEffect;
};

export type TowerHero = {
  id: number;
  name: string;
  /** Retrato recortado (PNG com alpha). */
  portrait: string | null;
  icon: string | null;
  color: string;
  hp: number;
  /** Dano por segundo da arma, como a ficha do jogo calcula. */
  dps: number;
  regen: number;
  abilities: TowerAbility[];
};

export type ItemSlot = "weapon" | "vitality" | "spirit";

/** Atributos que os itens dão. Frações onde o jogo usa porcentagem. */
export type ItemStats = {
  hp: number;
  weapon: number;
  fireRate: number;
  spirit: number;
  bulletResist: number;
  spiritResist: number;
  lifesteal: number;
  spiritLifesteal: number;
  cdr: number;
  regen: number;
  /** Barreira no início de cada luta. */
  barrier: number;
  /** Chance extra de tiro crítico (headshot). */
  crit: number;
  /** Fração da vida máxima do alvo por segundo, enquanto atira (veneno). */
  poison: number;
  /** Dano espiritual extra a cada habilidade usada. */
  burst: number;
};

export type TowerItem = {
  id: number;
  name: Loc;
  image: string | null;
  tier: number;
  slot: ItemSlot;
  stats: Partial<ItemStats>;
};

export type TowerCatalog = { heroes: TowerHero[]; items: TowerItem[] };
