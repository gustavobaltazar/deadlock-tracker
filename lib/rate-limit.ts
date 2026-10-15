/**
 * Limite de requisições por IP, em janela fixa.
 *
 * O site não tem banco, mas cada página de jogador e cada partida aberta viram
 * chamadas à Deadlock API — e os limites dela valem para o servidor inteiro,
 * compartilhados entre todos os visitantes (/v1/matches/metadata: 30 req/min
 * sem chave). Um único script martelando /api/match esgotaria essa cota e
 * derrubaria as builds para todo mundo. Este limite corta o abuso antes que
 * ele chegue à API.
 *
 * Os contadores vivem na memória da instância: na Vercel cada instância conta
 * por si, então o limite é por instância e não global. Contra um volume
 * distribuído de verdade, a defesa é o firewall da Vercel (DDoS automático e
 * regras de rate limit no painel); isto aqui cobre o caso comum de um IP só.
 */

export type Limit = { max: number; windowMs: number };

type Janela = { count: number; reset: number };

const janelas = new Map<string, Janela>();
/** Acima disso a tabela é varrida, para um ataque com IPs variados não estourar a memória. */
const MAX_CHAVES = 50_000;

function limpa(agora: number) {
  for (const [chave, janela] of janelas) {
    if (janela.reset <= agora) janelas.delete(chave);
  }
  // Se mesmo assim estiver cheia, é ataque com IPs distintos: descarta tudo
  // em vez de crescer sem limite. Perder contadores é melhor que cair.
  if (janelas.size >= MAX_CHAVES) janelas.clear();
}

/** Registra uma requisição e diz se ela passa; `retryAfter` em segundos. */
export function hit(
  chave: string,
  { max, windowMs }: Limit,
): { ok: true } | { ok: false; retryAfter: number } {
  const agora = Date.now();
  if (janelas.size >= MAX_CHAVES) limpa(agora);

  const janela = janelas.get(chave);
  if (!janela || janela.reset <= agora) {
    janelas.set(chave, { count: 1, reset: agora + windowMs });
    return { ok: true };
  }
  janela.count++;
  if (janela.count > max) {
    return { ok: false, retryAfter: Math.ceil((janela.reset - agora) / 1000) };
  }
  return { ok: true };
}

/**
 * IP do visitante. Na Vercel o `x-forwarded-for` é reescrito pela borda (o
 * cliente não consegue forjá-lo); o primeiro endereço da lista é o do
 * visitante.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
