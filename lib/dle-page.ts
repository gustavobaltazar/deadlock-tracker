/** Dados que as páginas do Deadlockdle mandam ao navegador. */
import type { DleHero } from "./dle";
import { dleDay, previousDay } from "./dle";

export { previousDay };

export type DleOptionData = { id: number; name: string; icon: string | null };

/**
 * Lista de heróis para a busca. Só nome e ícone: os atributos permitiriam
 * deduzir o herói do dia sem jogar.
 */
export function heroOptions(pool: DleHero[]): DleOptionData[] {
  return pool
    .map((h) => ({ id: h.id, name: h.name, icon: h.icon }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Retrato e cor de cada herói, para o cartão de vitória. */
export function heroPortraits(pool: DleHero[]) {
  return Object.fromEntries(
    pool.map((h) => [h.id, { portrait: h.portrait, color: h.styleHex }]),
  );
}

export function option(hero: DleHero): DleOptionData {
  return { id: hero.id, name: hero.name, icon: hero.icon };
}

/**
 * Dia que a página do modo vai jogar: hoje, ou ontem com `?day=yesterday`.
 * O dia de verdade vai junto, porque é a chave do progresso e da resposta.
 */
export async function gameDay(
  searchParams: Promise<{ day?: string | string[] }>,
): Promise<{ day: string; archive: boolean }> {
  const archive = (await searchParams).day === "yesterday";
  const today = dleDay();
  return { day: archive ? previousDay(today) : today, archive };
}
