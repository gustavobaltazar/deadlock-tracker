/**
 * Deadlockdle: o modo clássico do Loldle, com heróis do Deadlock.
 *
 * Todo dia há um herói secreto, o mesmo para todos. Cada palpite é comparado
 * atributo por atributo e o jogador vê, em quadrados coloridos, o que bate
 * (verde), o que bate em parte (laranja) e o que não bate (vermelho) — com seta
 * nos atributos numéricos, dizendo se o certo é maior ou menor.
 *
 * A comparação roda no servidor: o herói do dia nunca vai para o navegador, então
 * não dá para descobri-lo abrindo as ferramentas de desenvolvedor.
 */
import { get, getHeroMap, memoize, type Hero, type HeroTraits } from "./api";

/** Partidas mínimas num mês para o herói contar como presente no jogo. */
const MIN_MONTH_MATCHES = 1000;

export type DleHero = {
  id: number;
  name: string;
  icon: string | null;
  portrait: string | null;
  styleHex: string | null;
  traits: HeroTraits;
  /** Mês em que o herói entrou no jogo, "AAAA-MM". */
  release: string;
};

/**
 * Heróis do jogo e o mês em que cada um chegou.
 *
 * O catálogo não traz data de lançamento, então ela sai das próprias partidas:
 * o primeiro mês com volume relevante de jogos do herói. A coleta da API começa
 * em agosto de 2024, então os heróis originais aparecem todos nesse mês.
 *
 * Entram no sorteio os heróis jogados nos dois últimos meses (fica de fora o
 * que foi removido ou está só em teste) que chegaram **antes do mês corrente**.
 * O corte por mês deixa o conjunto estável o mês inteiro: um herói novo que
 * atinge o volume mínimo no meio do dia não muda o herói secreto de quem já
 * está jogando — ele entra no sorteio no mês seguinte.
 */
export const getDlePool = memoize(21600, async (): Promise<DleHero[]> => {
  type Bucket = { hero_id: number; bucket: number; matches: number };
  const [heroes, buckets] = await Promise.all([
    getHeroMap(),
    get<Bucket[]>(
      "/v1/analytics/hero-stats?bucket=start_time_month&min_unix_timestamp=1672531200",
      86400,
    ),
  ]);

  const firstMonth = new Map<number, number>();
  let lastBucket = 0;
  for (const b of buckets) {
    if (b.matches < MIN_MONTH_MATCHES) continue;
    lastBucket = Math.max(lastBucket, b.bucket);
    const first = firstMonth.get(b.hero_id);
    if (first == null || b.bucket < first) firstMonth.set(b.hero_id, b.bucket);
  }

  // Penúltimo mês com dados: o último pode estar só começando.
  const recentFrom = previousMonth(lastBucket);
  const active = new Set(
    buckets
      .filter((b) => b.matches >= MIN_MONTH_MATCHES && b.bucket >= recentFrom)
      .map((b) => b.hero_id),
  );
  const thisMonth = monthStart(Date.now() / 1000);

  const pool: DleHero[] = [];
  for (const [id, first] of firstMonth) {
    const hero = heroes.get(id);
    if (!hero || !active.has(id) || first >= thisMonth) continue;
    if (!hero.traits.role) continue;
    pool.push(toDleHero(hero, first));
  }
  return pool.sort((a, b) => a.id - b.id);
});

function toDleHero(hero: Hero, releaseUnix: number): DleHero {
  return {
    id: hero.id,
    name: hero.name,
    icon: hero.icon,
    portrait: hero.portrait,
    styleHex: hero.styleHex,
    traits: hero.traits,
    release: new Date(releaseUnix * 1000).toISOString().slice(0, 7),
  };
}

function monthStart(unix: number): number {
  const d = new Date(unix * 1000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000;
}

function previousMonth(unix: number): number {
  const d = new Date(unix * 1000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1) / 1000;
}

/** Dia do jogo em UTC, "AAAA-MM-DD": o herói troca à meia-noite UTC. */
export function dleDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Dia anterior ao do jogo, "AAAA-MM-DD". */
export function previousDay(day: string): string {
  return dleDay(new Date(Date.parse(day + "T00:00:00Z") - 86_400_000));
}

/**
 * Dias que aceitam palpites: hoje e ontem, para quem perdeu o desafio do dia
 * anterior. Mais para trás, não — o desafio de ontem já é a "segunda chance".
 */
export function isPlayableDay(day: string): boolean {
  const today = dleDay();
  return day === today || day === previousDay(today);
}

/** Semente de cada modo. A do clássico não pode mudar: mudaria o herói do dia. */
export const DLE_SALT = { classic: 0x5ea4c, voice: 0x7f3a1, ability: 0x3b9d7 } as const;

/** Gerador pseudoaleatório determinístico (mulberry32). */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Herói secreto de um dia.
 *
 * Os dias são agrupados em ciclos do tamanho do elenco, e cada ciclo usa uma
 * ordem embaralhada dos heróis: assim nenhum herói se repete antes de todos os
 * outros terem saído, o que um sorteio independente por dia não garantiria.
 * Cada modo usa um `salt` próprio, para os heróis do dia não coincidirem.
 */
export function heroOfDay(
  pool: DleHero[],
  day: string,
  salt: number = DLE_SALT.classic,
): DleHero {
  const dayNumber = Math.floor(Date.parse(day + "T00:00:00Z") / 86_400_000);
  const cycle = Math.floor(dayNumber / pool.length);
  const order = [...pool];
  const random = seeded(cycle * 2654435761 + salt);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order[dayNumber % pool.length];
}

export type DleStatus = "correct" | "partial" | "wrong";
/** Para onde está o certo: "up" = o herói secreto tem valor maior. */
export type DleArrow = "up" | "down" | null;

export type DleCell<T> = { value: T; status: DleStatus; arrow?: DleArrow };

export type DleRow = {
  heroId: number;
  name: string;
  icon: string | null;
  correct: boolean;
  gender: DleCell<string>;
  role: DleCell<string>;
  weapon: DleCell<string>;
  tags: DleCell<string[]>;
  complexity: DleCell<number>;
  health: DleCell<number>;
  release: DleCell<string>;
};

/** Atributo de texto: igual ou não. Vazio nunca bate — é dado ausente, não um valor. */
function exact(guess: string, answer: string): DleCell<string> {
  return { value: guess, status: guess && guess === answer ? "correct" : "wrong" };
}

/** Atributo ordenável: igual, ou seta apontando para o lado do certo. */
function ordered<T extends number | string>(guess: T, answer: T): DleCell<T> {
  if (guess === answer) return { value: guess, status: "correct", arrow: null };
  return { value: guess, status: "wrong", arrow: answer > guess ? "up" : "down" };
}

export function compareHeroes(guess: DleHero, answer: DleHero): DleRow {
  const g = guess.traits;
  const a = answer.traits;
  const shared = g.tags.filter((tag) => a.tags.includes(tag)).length;
  const sameTags = shared === a.tags.length && shared === g.tags.length;

  return {
    heroId: guess.id,
    name: guess.name,
    icon: guess.icon,
    correct: guess.id === answer.id,
    gender: exact(g.gender, a.gender),
    role: exact(g.role, a.role),
    weapon: exact(g.weapon, a.weapon),
    tags: {
      value: g.tags,
      status: sameTags ? "correct" : shared > 0 ? "partial" : "wrong",
    },
    complexity: ordered(g.complexity, a.complexity),
    health: ordered(g.health, a.health),
    // "AAAA-MM" ordena como texto na mesma ordem que como data.
    release: ordered(guess.release, answer.release),
  };
}
