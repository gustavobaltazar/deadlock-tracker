/**
 * Catálogo da Torre, montado no servidor a partir da Deadlock API: heróis com
 * vida, DPS da arma e as quatro habilidades já traduzidas para a mecânica do
 * jogo, e os itens da loja com os atributos que a Torre usa.
 *
 * As respostas cruas somam mais de 10 MB; o que vai ao navegador cabe em
 * poucas dezenas de KB. Fica em memória por 24h.
 */
import { get, memoize } from "../api";
import {
  parseAbility,
  parseHero,
  parseItem,
  type RawAbility,
  type RawHero,
  type RawItem,
  type RawWeapon,
} from "./parse";
import type { TowerCatalog } from "./types";

type Named = { class_name?: string; id?: number; name?: string };

export const getTowerCatalog = memoize(86400, async (): Promise<TowerCatalog> => {
  const [heroes, abilities, abilitiesPt, weapons, upgrades, upgradesPt] = await Promise.all([
    get<RawHero[]>("/v1/assets/heroes", "no-store"),
    get<RawAbility[]>("/v1/assets/items/by-type/ability", "no-store"),
    get<Named[]>("/v1/assets/items/by-type/ability?language=brazilian", "no-store"),
    get<(RawWeapon & Named)[]>("/v1/assets/items/by-type/weapon", "no-store"),
    get<RawItem[]>("/v1/assets/items/by-type/upgrade", "no-store"),
    get<Named[]>("/v1/assets/items/by-type/upgrade?language=brazilian", "no-store"),
  ]);

  const abilityBy = new Map(abilities.map((a) => [a.class_name, a]));
  const abilityPt = new Map(abilitiesPt.map((a) => [a.class_name, a.name]));
  const weaponBy = new Map(weapons.map((w) => [w.class_name, w]));
  const upgradePt = new Map(upgradesPt.map((u) => [u.id, u.name]));

  const towerHeroes = heroes
    .filter((h) => h.player_selectable && !h.disabled)
    .map((h) => {
      const kit = [1, 2, 3, 4]
        .map((n) => abilityBy.get(h.items?.[`signature${n}`]))
        .map((raw, slot) => (raw ? parseAbility(raw, abilityPt.get(raw.class_name), slot) : null));
      if (kit.some((a) => !a)) return null;
      return parseHero(h, weaponBy.get(h.items?.weapon_primary), kit as NonNullable<(typeof kit)[number]>[]);
    })
    .filter((h): h is NonNullable<typeof h> => h !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const items = upgrades
    .map((u) => parseItem(u, upgradePt.get(u.id)))
    .filter((i): i is NonNullable<typeof i> => i !== null && Boolean(i.image));

  return { heroes: towerHeroes, items };
});
