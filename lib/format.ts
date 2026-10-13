import { fill, type Dictionary } from "./i18n";

/**
 * Formatações que dependem de idioma. Recebem o dicionário em vez de importá-lo
 * para funcionarem igual em Server e Client Components.
 */

/** match_mode e game_mode são índices dos enums da API. */
export function modeLabel(
  matchMode: number,
  gameMode: number,
  t: Dictionary,
): string {
  // game_mode 4 é Street Brawl e se sobrepõe ao modo de partida.
  if (gameMode === 4) return t.modes.brawl;
  const modes = t.modes as unknown as Record<string, string>;
  return modes[String(matchMode)] ?? t.modes.unknown;
}

export function duration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function timeAgo(unixSeconds: number, t: Dictionary): string {
  const diff = Date.now() / 1000 - unixSeconds;
  const minutes = Math.round(diff / 60);
  if (minutes < 60) return fill(t.time.minutesAgo, { n: Math.max(1, minutes) });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return fill(t.time.hoursAgo, { n: hours });
  const days = Math.round(hours / 24);
  if (days < 30) return fill(t.time.daysAgo, { n: days });
  const months = Math.round(days / 30);
  if (months < 12) return fill(t.time.monthsAgo, { n: months });
  return fill(t.time.yearsAgo, { n: Math.round(months / 12) });
}

/** Números compactos no formato do idioma (52 mil / 52K). */
export function compact(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "pt" ? "pt-BR" : "en-US", {
    notation: "compact",
  }).format(value);
}

export function kda(
  kills: number,
  deaths: number,
  assists: number,
  t: Dictionary,
): string {
  if (deaths === 0) return t.match.perfectKda;
  return ((kills + assists) / deaths).toFixed(2);
}

export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}
