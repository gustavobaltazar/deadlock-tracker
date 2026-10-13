/** match_mode: índice do enum ActiveMatchMode da API. */
const MATCH_MODES: Record<number, string> = {
  1: "Normal",
  2: "Lobby privado",
  3: "Contra bots",
  4: "Ranqueada",
  5: "Teste",
  6: "Tutorial",
  7: "Hero Labs",
  8: "Novo jogador",
};

/** game_mode: índice do enum ActiveMatchGameMode da API. */
const GAME_MODES: Record<number, string> = {
  1: "Normal",
  2: "1v1",
  3: "Sandbox",
  4: "Street Brawl",
};

export function modeLabel(matchMode: number, gameMode: number): string {
  if (gameMode === 4) return GAME_MODES[4];
  return MATCH_MODES[matchMode] ?? "Desconhecido";
}

export function duration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function timeAgo(unixSeconds: number): string {
  const diff = Date.now() / 1000 - unixSeconds;
  const minutes = Math.round(diff / 60);
  if (minutes < 60) return `${Math.max(1, minutes)} min atrás`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d atrás`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} meses atrás`;
  return `${Math.round(months / 12)} anos atrás`;
}

export function compact(value: number): string {
  return new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(value);
}

export function kda(kills: number, deaths: number, assists: number): string {
  if (deaths === 0) return "Perfeito";
  return ((kills + assists) / deaths).toFixed(2);
}

export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}
