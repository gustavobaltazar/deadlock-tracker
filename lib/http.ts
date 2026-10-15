/**
 * Cabeçalhos de cache das rotas de API.
 *
 * `s-maxage` deixa a CDN da Vercel guardar a resposta: enquanto ela vale, a
 * mesma URL é servida da borda sem executar a função nem chamar a Deadlock
 * API. É a principal defesa contra picos — mil pessoas abrindo a mesma
 * partida viram uma chamada só. `stale-while-revalidate` continua servindo a
 * versão antiga enquanto busca a nova em segundo plano, então ninguém espera.
 * Erros nunca são cacheados.
 */
export function cdnCache(seconds: number, staleSeconds = seconds * 10) {
  return {
    "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${staleSeconds}`,
  };
}

export const NO_STORE = { "Cache-Control": "no-store" };
