/** Dados que as páginas do Deadlockdle mandam ao navegador. */
import type { DleHero } from "./dle";
import { dleDay } from "./dle";

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

/** Dia anterior ao do jogo, "AAAA-MM-DD". */
export function previousDay(day: string): string {
  return dleDay(new Date(Date.parse(day + "T00:00:00Z") - 86_400_000));
}
