/**
 * Modo Habilidade do Deadlockdle: o jogador vê o ícone de uma habilidade do
 * herói do dia e adivinha de quem é.
 *
 * No Loldle o desafio é o ícone em preto e branco, mas os ícones do Deadlock já
 * são glifos brancos sobre fundo transparente. Então o desafio aqui é outro: o
 * jogo começa num close-up de um pedaço do ícone, girado e espelhado. A cada
 * erro o zoom abre um pouco; com erros suficientes o ícone aparece inteiro e,
 * por fim, desvirado. Depois de acertar o herói, uma rodada bônus pergunta qual
 * das quatro habilidades dele é aquela.
 *
 * O recorte é feito no servidor: o navegador só recebe a imagem do estágio em
 * que a pessoa está, nunca o ícone inteiro antes da hora, e a URL não carrega
 * o nome do herói (os arquivos ficam em `/abilities/<herói>/...`).
 */
import sharp from "sharp";
import { get, getHeroMap, memoize } from "./api";
import { DLE_SALT, getDlePool, heroOfDay, seeded, type DleHero } from "./dle";

/** Zoom de cada estágio; o estágio é o número de erros, até o último. */
export const ABILITY_ZOOM = [4.5, 3.6, 2.8, 2.2, 1.7, 1.3, 1] as const;
/** Estágio em que o ícone aparece inteiro e na posição certa. */
export const ABILITY_STRAIGHT = ABILITY_ZOOM.length;

export type AbilityName = { en: string; pt: string };

type Ability = { name: AbilityName; image: string };

/**
 * Habilidades de herói, por `class_name`, com o nome em inglês e em português.
 * A rota por tipo traz só as habilidades (~3,7 MB por idioma, em vez dos ~6 MB
 * do catálogo inteiro); guardamos só nome e ícone, por 24h.
 */
const getAbilities = memoize(86400, async () => {
  type Raw = { class_name?: string; name?: string; image?: string | null };
  const [en, pt] = await Promise.all([
    get<Raw[]>("/v1/assets/items/by-type/ability", "no-store"),
    get<Raw[]>("/v1/assets/items/by-type/ability?language=brazilian", "no-store"),
  ]);
  const ptNames = new Map(pt.map((a) => [a.class_name, a.name]));
  const map = new Map<string, Ability>();
  for (const a of en) {
    if (!a.class_name || !a.name || !a.image) continue;
    map.set(a.class_name, {
      name: { en: a.name, pt: ptNames.get(a.class_name) || a.name },
      image: a.image,
    });
  }
  return map;
});

export type AbilityDay = {
  hero: DleHero;
  pool: DleHero[];
  /** Posição (0 a 3) da habilidade sorteada entre as quatro do herói. */
  slot: number;
  /** As quatro habilidades do herói, na ordem das teclas. */
  abilities: Ability[];
  /** Sementes do recorte: ponto de foco, giro e espelhamento. */
  crop: { focus: number; turns: 1 | 2 | 3; mirror: boolean };
};

export async function abilityOfDay(day: string): Promise<AbilityDay> {
  const [all, heroes, catalog] = await Promise.all([
    getDlePool(),
    getHeroMap(),
    getAbilities(),
  ]);
  const kit = (id: number) =>
    (heroes.get(id)?.abilities ?? [])
      .map((c) => catalog.get(c))
      .filter((a): a is Ability => Boolean(a));

  // Só entra quem tem as quatro habilidades com ícone: o bônus pergunta entre elas.
  const pool = all.filter((h) => kit(h.id).length === 4);
  const hero = heroOfDay(pool, day, DLE_SALT.ability);

  const dayNumber = Math.floor(Date.parse(day + "T00:00:00Z") / 86_400_000);
  const random = seeded(dayNumber * 48271 + DLE_SALT.ability);
  return {
    hero,
    pool,
    abilities: kit(hero.id),
    slot: Math.floor(random() * 4),
    crop: {
      focus: random(),
      turns: (1 + Math.floor(random() * 3)) as 1 | 2 | 3,
      mirror: random() < 0.5,
    },
  };
}

/** Lado da imagem trabalhada e da imagem entregue, em pixels. */
const WORK = 512;
const OUT = 320;

/**
 * Centros possíveis para o close-up inicial, do mais para o menos interessante.
 *
 * Mirando um ponto qualquer, o primeiro recorte cai muitas vezes num quadrado
 * todo branco, todo vazio ou cortado por uma só linha reta — nada para
 * reconhecer. Cada candidato é avaliado pela janela do primeiro estágio: ela
 * precisa misturar glifo e fundo (entre 25% e 70% preenchida) e ganha pontos
 * por quantas bordas atravessa, que é o que dá forma ao recorte.
 */
function focusCandidates(alpha: (x: number, y: number) => number): [number, number][] {
  const half = Math.round(WORK / ABILITY_ZOOM[0] / 2);
  const step = 4;
  const scored: { point: [number, number]; score: number }[] = [];

  for (let cy = half; cy <= WORK - half; cy += 16) {
    for (let cx = half; cx <= WORK - half; cx += 16) {
      let filled = 0;
      let samples = 0;
      let edges = 0;
      for (let y = cy - half; y < cy + half; y += step) {
        let prev = alpha(cx - half, y) > 128;
        for (let x = cx - half; x < cx + half; x += step) {
          const on = alpha(x, y) > 128;
          filled += Number(on);
          samples++;
          if (on !== prev) edges++;
          prev = on;
        }
      }
      // Bordas verticais também: uma janela só de faixas horizontais não conta.
      for (let x = cx - half; x < cx + half; x += step) {
        let prev = alpha(x, cy - half) > 128;
        for (let y = cy - half; y < cy + half; y += step) {
          const on = alpha(x, y) > 128;
          if (on !== prev) edges++;
          prev = on;
        }
      }
      const coverage = filled / samples;
      if (coverage < 0.25 || coverage > 0.7) continue;
      scored.push({ point: [cx, cy], score: edges });
    }
  }

  scored.sort((p, q) => q.score - p.score);
  // Metade de cima: variedade entre os dias sem cair nas janelas mais pobres.
  return scored.slice(0, Math.max(1, Math.ceil(scored.length / 2))).map((c) => c.point);
}

/**
 * Imagem do estágio pedido: recorte em volta do ponto de foco, ampliado, girado
 * e espelhado. Conforme o zoom cai, a janela cresce e encosta nas bordas, até
 * cobrir o ícone inteiro; no último estágio o giro e o espelho saem.
 */
export async function renderAbility(day: string, stage: number): Promise<Buffer> {
  const { abilities, slot, crop } = await abilityOfDay(day);
  const res = await fetch(abilities[slot].image, {
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`ícone ${res.status}`);

  const { data } = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize(WORK, WORK, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const straight = stage >= ABILITY_STRAIGHT;
  const zoom = ABILITY_ZOOM[Math.min(stage, ABILITY_ZOOM.length - 1)];
  const points = focusCandidates((x, y) => data[(y * WORK + x) * 4 + 3]);
  const [fx, fy] = points[Math.floor(crop.focus * points.length)] ?? [WORK / 2, WORK / 2];

  const size = Math.round(WORK / zoom);
  const clamp = (v: number) => Math.min(Math.max(Math.round(v - size / 2), 0), WORK - size);

  let image = sharp(data, { raw: { width: WORK, height: WORK, channels: 4 } })
    .extract({ left: clamp(fx), top: clamp(fy), width: size, height: size })
    .resize(OUT, OUT, { kernel: "lanczos3" });
  if (!straight) {
    image = image.rotate(crop.turns * 90);
    if (crop.mirror) image = image.flop();
  }
  return image.png().toBuffer();
}
