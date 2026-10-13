# Deadlock Tracker

Tracker de estatísticas de [Deadlock](https://store.steampowered.com/app/1422450/Deadlock/):
busca de jogadores, histórico de partidas, builds e comparação da sua build com a de
jogadores de elo alto no mesmo confronto.

Projeto não oficial, sem vínculo com a Valve. Os dados vêm da
[Deadlock API](https://deadlock-api.com) comunitária.

## O que faz

- **Busca flexível** — nome Steam, account ID, SteamID64, SteamID3 ou o link do
  perfil (`/profiles/<id>` e `/id/<vanity>`), sem precisar de chave da Steam Web API.
- **Perfil do jogador** — elo atual, heróis mais jogados, taxa de vitória e KDA das
  últimas partidas, com o cabeçalho tematizado pelo herói que o jogador mais vence.
- **Histórico paginado** — todas as partidas que a API conhece, com a build de cada uma.
- **Detalhe da partida** — os 12 jogadores, suas builds e os times.
- **Análise de build** — compara o que você comprou com o que jogadores Phantom ou
  acima compram com o mesmo herói, contra os mesmos adversários, na mesma lane; e
  sugere trocas dentro do mesmo tier.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4

Os Route Handlers funcionam como camada de servidor: evitam CORS, cacheiam os
catálogos da API e reduzem payloads grandes antes de chegarem ao browser.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>. Não há variáveis de ambiente nem credenciais: todos os
endpoints usados são públicos.

## Deploy

O projeto roda sem nenhuma variável de ambiente. Para produção, duas são
opcionais (ver `.env.example`):

| Variável | Para quê |
| --- | --- |
| `DEADLOCK_API_KEY` | Eleva os limites da Deadlock API. Sem ela, os limites valem por IP — e em produção o IP do servidor é compartilhado por todos os visitantes. |
| `NEXT_PUBLIC_SITE_URL` | URL pública, usada nos metadados de compartilhamento. Detectada automaticamente na Vercel. |

O endpoint mais restrito é `/v1/matches/metadata`: **30 req/min por IP** contra
**30 req/10s com chave**. As respostas são cacheadas no servidor, então visitas ao
mesmo jogador não repetem a chamada.

## Notas sobre os dados

Alguns comportamentos da fonte que afetam o que aparece na tela:

- **Partidas recentes podem faltar.** A API só indexa partidas de contas comuns com
  atraso de horas a dias. Dados em tempo real exigem que a conta seja "bot friend"
  (recurso pago da API) ou use a [ferramenta de ingest](https://deadlock-api.com/ingest-cache).
  A interface mostra há quanto tempo foi a última partida registrada.
- **Vitória** é `match_result === player_team` — `match_result` é o time vencedor, não
  um booleano.
- **Aderência de build não é nota de qualidade.** Ela mede o quanto a build seguiu o
  consenso daquele confronto; itens situacionais raros derrubam o número sem serem erro.
- **Tier de item é preço** (800 / 1600 / 3200 / 6400), por isso as sugestões de
  troca nunca cruzam tiers.

## Licença

Os assets de Deadlock pertencem à Valve.
