/**
 * Cliente da Deadlock API (https://api.deadlock-api.com).
 * Todos os endpoints usados aqui são públicos — endpoints Patreon-only
 * (/card, /account-stats) são deliberadamente evitados.
 */

const API = "https://api.deadlock-api.com";

/** account_id é o SteamID3 usado por toda a API. */
export type SteamProfile = {
  account_id: number;
  personaname: string | null;
  profileurl: string | null;
  avatar: string | null;
  avatarmedium: string | null;
  avatarfull: string | null;
  realname: string | null;
  countrycode: string | null;
  last_updated: string | null;
  matches_played_last_30d: number | null;
  last_team_avg_badge: number | null;
};

export type MatchHistoryEntry = {
  account_id: number;
  match_id: number;
  hero_id: number;
  hero_level: number;
  start_time: number;
  game_mode: number;
  match_mode: number;
  player_team: number;
  player_kills: number;
  player_deaths: number;
  player_assists: number;
  denies: number;
  net_worth: number;
  last_hits: number;
  team_abandoned: boolean | null;
  abandoned_time_s: number | null;
  match_duration_s: number;
  /** Time vencedor (0 ou 1), NÃO um booleano de vitória. */
  match_result: number;
  ranked_display_badge: number | null;
  ranked_delta: number | null;
};

export type PlayerRank = {
  badge: number;
  rank: number;
  subrank: number;
  last_match: { match_id: number; start_time: number } | null;
};

export type PlayerHeroStats = {
  account_id: number;
  hero_id: number;
  matches_played: number;
  wins: number;
  last_played: number;
  time_played: number;
  kills: number;
  deaths: number;
  assists: number;
  ending_level: number;
  networth_per_min: number;
  last_hits_per_min: number;
  /** Partidas por posição no ranking de MVP: [MVP, 2º, 3º]. */
  mvp_rank_counts?: number[] | null;
  /** Partidas jogadas desde que a Valve passou a registrar MVP (06/01/2026). */
  mvp_rated_matches?: number | null;
};

export type MvpSummary = {
  mvp: number;
  /** Vezes em 2º ou 3º — os "Key Players" do fim de partida. */
  keyPlayer: number;
  /** Base da taxa: só partidas com MVP registrado, não o histórico inteiro. */
  rated: number;
  /** Herói com mais MVPs, se houver algum. */
  topHero: { heroId: number; count: number } | null;
};

/**
 * Soma os MVPs de todos os heróis. A taxa usa `mvp_rated_matches` e não
 * `matches_played`: partidas anteriores a 06/01/2026 não têm MVP registrado e
 * puxariam a taxa para baixo sem motivo.
 */
export function summarizeMvps(stats: PlayerHeroStats[]): MvpSummary | null {
  let mvp = 0;
  let keyPlayer = 0;
  let rated = 0;
  let topHero: MvpSummary["topHero"] = null;
  for (const s of stats) {
    const [first = 0, second = 0, third = 0] = s.mvp_rank_counts ?? [];
    mvp += first;
    keyPlayer += second + third;
    rated += s.mvp_rated_matches ?? 0;
    if (first > 0 && (!topHero || first > topHero.count)) {
      topHero = { heroId: s.hero_id, count: first };
    }
  }
  return rated > 0 ? { mvp, keyPlayer, rated, topHero } : null;
}

export type Hero = {
  id: number;
  name: string;
  icon: string | null;
  card: string | null;
  /** Arte de fundo dedicada do herói (4096x2312), apenas grafismo — sem personagem. */
  background: string | null;
  /** Retrato recortado do personagem (280x380, PNG com alpha). */
  portrait: string | null;
  /** Cor temática oficial do herói, ex. "#C93C26". */
  styleHex: string | null;
  /** Atributos do herói usados no Deadlockdle. */
  traits: HeroTraits;
};

export type HeroTraits = {
  /** "male" | "female"; vazio quando a API não informa. */
  gender: string;
  /** "assassin" | "brawler" | "marksman" | "mystic" */
  role: string;
  /** Tipo de arma, como o jogo descreve ("Rapid Fire", "Pistol"…). */
  weapon: string;
  /** As três tags de personalidade do herói. */
  tags: string[];
  /** Dificuldade do herói, de 1 a 4. */
  complexity: number;
  /** Vida base no nível 1. */
  health: number;
  /** Nome interno do herói ("atlas" = Abrams), usado nas pastas de áudio. */
  codename: string;
  /** Resumo oficial do papel do herói, ex. "Sneaks in and sprays bullets". */
  blurb: string;
};

/** Partida já enriquecida com os dados do herói, pronta para o cliente. */
export type MatchView = MatchHistoryEntry & {
  heroName: string;
  heroIcon: string | null;
  /** Build final do jogador na partida, em ordem de compra. */
  items: ItemView[];
  /**
   * Se a partida já tem metadata na API. O histórico registra a partida antes
   * da coleta dos detalhes, então as mais recentes podem ainda não ter placar
   * nem builds — nesse caso a linha não abre.
   */
  hasDetails: boolean;
};

/**
 * Trecho de texto do jogo: `highlight` marca os termos que ele realça e `dim`
 * os que ele apaga (ressalvas, condições).
 */
export type RichText = { text: string; highlight: boolean; dim?: boolean }[];

export type ItemStat = {
  label: string;
  value: string;
  icon: string | null;
  /** Família do atributo (fire_rate, healing, cooldown…), define a cor. */
  cssClass: string | null;
  /** O jogo marca estes como "Conditional": só valem quando o efeito dispara. */
  conditional: boolean;
};

export type ItemSection = {
  /** "innate" = bônus permanente; "passive"/"active" = o efeito do item. */
  kind: string;
  text: RichText | null;
  /** Atributos em destaque, exibidos em caixas. */
  important: ItemStat[];
  /** Demais atributos, em lista. */
  details: ItemStat[];
};

export type ItemView = {
  id: number;
  /** Nome oficial em inglês, igual ao do jogo. */
  name: string;
  image: string | null;
  /** "weapon" | "vitality" | "spirit" */
  slot: string;
  /** No Deadlock o tier determina o preço: T1=800, T2=1600, T3=3200, T4=6400. */
  tier: number;
  /**
   * Custo em almas. Itens fora da loja normal (os 23 marcados como tier 5)
   * vêm com o sentinela 9999, que não é um preço de verdade.
   */
  cost: number;
  /** Resumo do que o item faz. */
  description: RichText | null;
  /** "passive", "instant_cast"… */
  activation: string | null;
  /** Seções do tooltip oficial, já resolvidas em rótulo + valor. */
  sections: ItemSection[];
  /** Itens que este substitui ao ser comprado. */
  upgradesFrom: ItemRef[];
  /** Itens em que este pode virar. */
  upgradesTo: ItemRef[];
};

/** Item citado dentro do cartão de outro, só com o necessário para exibi-lo. */
export type ItemRef = {
  id: number;
  name: string;
  image: string | null;
};

/** Classes com que o jogo realça um termo dentro do texto. */
const REALCE = /\b(highlight|inline-attribute-label)\b/;
/** Classe com que ele apaga um trecho — ressalvas e condições. */
const APAGADO = /\bdiminish\b/;

/**
 * Converte o texto do jogo em segmentos marcados.
 *
 * As descrições vêm com HTML (`<span class="highlight">`, `<br>`, ícones em
 * `<svg>`). Em vez de injetar esse markup na página, quebramos em segmentos e
 * deixamos o React renderizar — nada vindo da API é interpretado como HTML.
 *
 * O percurso é feito com uma pilha de classes abertas, e não casando pares de
 * `<span>`: o jogo aninha realces (um `inline-attribute-label` dentro de um
 * `highlight`, por exemplo) e um casamento ingênuo fecharia a tag errada.
 */
function parseRichText(raw: string | null | undefined): RichText | null {
  if (!raw) return null;

  const normalizado = raw
    .replace(/<br\s*\/?>/gi, " ")
    // Ícones embutidos no meio da frase: o nome do atributo vem logo depois,
    // em texto, então remover a arte não deixa buraco de sentido.
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<img[^>]*>/gi, "");

  const partes: RichText = [];
  const abertas: string[] = [];

  const adiciona = (bruto: string) => {
    const text = bruto.replace(/\s+/g, " ");
    if (!text) return;
    const classes = abertas.join(" ");
    const highlight = REALCE.test(classes);
    const dim = APAGADO.test(classes);
    // Junta com o anterior quando a marcação é a mesma, para não transformar
    // uma frase em dezenas de segmentos.
    const ultimo = partes.at(-1);
    if (ultimo && ultimo.highlight === highlight && !!ultimo.dim === dim) {
      ultimo.text += text;
      return;
    }
    partes.push(dim ? { text, highlight, dim } : { text, highlight });
  };

  const tags = /<span([^>]*)>|<\/span\s*>|<[^>]+>/gi;
  let ultimoCorte = 0;
  let m: RegExpExecArray | null;
  while ((m = tags.exec(normalizado))) {
    adiciona(normalizado.slice(ultimoCorte, m.index));
    if (m[1] !== undefined) {
      abertas.push(/class="([^"]*)"/.exec(m[1])?.[1] ?? "");
    } else if (m[0].startsWith("</span")) {
      abertas.pop();
    }
    ultimoCorte = tags.lastIndex;
  }
  adiciona(normalizado.slice(ultimoCorte));

  return partes.length > 0 ? partes : null;
}

export function toMatchViews(
  matches: MatchHistoryEntry[],
  heroes: Map<number, Hero>,
  itemsByMatch?: Map<number, ItemView[]> | null,
): MatchView[] {
  return matches.map((m) => {
    const hero = heroes.get(m.hero_id);
    return {
      ...m,
      heroName: hero?.name ?? `Herói ${m.hero_id}`,
      heroIcon: hero?.icon ?? null,
      items: itemsByMatch?.get(m.match_id) ?? [],
      // Sem o mapa (a busca em lote falhou) não dá para saber: deixa abrir.
      hasDetails: itemsByMatch ? itemsByMatch.has(m.match_id) : true,
    };
  });
}

/**
 * O jogador venceu se o time vencedor da partida é o time dele.
 * Validado cruzando com os `wins` de /v1/players/hero-stats.
 */
export function isWin(m: MatchHistoryEntry): boolean {
  return m.match_result === m.player_team;
}

/**
 * Chave opcional da Deadlock API (header `X-API-KEY`).
 *
 * Sem ela a API funciona, mas os limites valem por IP — e em produção todas as
 * requisições saem do mesmo IP do servidor, compartilhado entre os visitantes.
 * O endpoint mais restrito é /v1/matches/metadata: 30 req/min por IP contra
 * 30 req/10s com chave. Defina DEADLOCK_API_KEY no ambiente para usá-la.
 */
const API_KEY = process.env.DEADLOCK_API_KEY;

/**
 * Tempo máximo de espera pela Deadlock API. Sem ele, uma API lenta prende as
 * funções do servidor até o timeout da plataforma — e sob tráfego alto isso
 * esgota a concorrência e derruba o site inteiro, não só a página lenta. Os
 * catálogos (até ~8 MB) ganham mais folga.
 */
const TIMEOUT_MS = 10_000;
const TIMEOUT_CATALOG_MS = 25_000;

/**
 * `revalidate` em segundos usa o data cache do Next; `"no-store"` pula esse
 * cache, para respostas grandes demais que são cacheadas com `memoize`.
 */
export async function get<T>(
  path: string,
  revalidate: number | "no-store",
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      headers: {
        Accept: "application/json",
        ...(API_KEY ? { "X-API-KEY": API_KEY } : {}),
      },
      signal: AbortSignal.timeout(
        revalidate === "no-store" ? TIMEOUT_CATALOG_MS : TIMEOUT_MS,
      ),
      ...(revalidate === "no-store"
        ? { cache: "no-store" as const }
        : { next: { revalidate } }),
    });
  } catch (error) {
    // Timeout ou falha de rede: tratado como indisponibilidade da API.
    throw new ApiError(
      `Deadlock API indisponível em ${path}: ${error instanceof Error ? error.message : error}`,
      504,
    );
  }
  if (!res.ok) {
    throw new ApiError(`Deadlock API ${res.status} em ${path}`, res.status);
  }
  return res.json() as Promise<T>;
}

/**
 * Cache em memória para os catálogos grandes.
 *
 * O data cache do Next recusa respostas acima de 2 MB, e /v1/assets/heroes
 * (~2,5 MB) e /v1/assets/items (~8 MB) passam disso — com `revalidate` eles
 * eram baixados de novo a cada requisição. Aqui guardamos o resultado já
 * processado, bem menor, na memória do processo. Quem chega enquanto a busca
 * está em andamento reaproveita a mesma promessa; se ela falhar, sai do cache.
 */
export function memoize<T>(ttlSeconds: number, load: () => Promise<T>): () => Promise<T> {
  let cached: { value: Promise<T>; expires: number } | null = null;
  return () => {
    if (cached && cached.expires > Date.now()) return cached.value;
    const value = load();
    const entry = { value, expires: Date.now() + ttlSeconds * 1000 };
    cached = entry;
    value.catch(() => {
      if (cached === entry) cached = null;
    });
    return value;
  };
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Código de erro devolvido pelas rotas de API ao navegador. A mensagem real
 * (com caminho e status da Deadlock API) fica só no log do servidor; o cliente
 * recebe um código e mostra o texto no idioma da página.
 */
export function errorCode(error: unknown): "rate_limited" | "upstream" {
  return error instanceof ApiError && error.status === 429
    ? "rate_limited"
    : "upstream";
}

/** Maior account_id possível: o SteamID3 é um inteiro de 32 bits sem sinal. */
const MAX_ACCOUNT_ID = 0xffffffff;

/** Converte a entrada em account_id válido, ou null. */
export function parseAccountId(raw: string | null | undefined): number | null {
  if (!raw || !/^\d{1,10}$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 && id <= MAX_ACCOUNT_ID ? id : null;
}

/**
 * O link do perfil vem da API e vai parar num `href`. Só aceitamos o perfil na
 * própria Steam: qualquer outra coisa (um `javascript:` vindo de dado
 * adulterado, por exemplo) é descartada.
 */
function safeProfileUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" &&
      parsed.hostname === "steamcommunity.com"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

export async function searchPlayers(query: string, limit = 8): Promise<SteamProfile[]> {
  const q = new URLSearchParams({ search_query: query, limit: String(limit) });
  const rows = await get<SteamProfile[]>(`/v1/players/steam-search?${q}`, 300);
  // `friends` vem na resposta e pesa centenas de KB; descartamos aqui.
  return rows.map(stripProfile);
}

export async function getProfile(accountId: number): Promise<SteamProfile | null> {
  const rows = await get<SteamProfile[]>(
    `/v1/players/steam?account_ids=${accountId}`,
    300,
  );
  return rows[0] ? stripProfile(rows[0]) : null;
}

/** Vários perfis numa chamada só; a ordem da resposta não é garantida. */
export async function getProfiles(
  accountIds: number[],
): Promise<Map<number, SteamProfile>> {
  const map = new Map<number, SteamProfile>();
  if (accountIds.length === 0) return map;
  try {
    const rows = await get<SteamProfile[]>(
      `/v1/players/steam?account_ids=${accountIds.join(",")}`,
      300,
    );
    for (const p of rows) map.set(p.account_id, stripProfile(p));
  } catch {
    // Sem perfil a lista cai no "Jogador {id}"; não é motivo para quebrar.
  }
  return map;
}

export type FrequentMate = {
  accountId: number;
  name: string | null;
  avatar: string | null;
  matches: number;
  wins: number;
};

/**
 * Jogadores que mais estiveram no mesmo time que o jogador.
 *
 * `same_party=false` conta qualquer partida no mesmo time, e não só as em
 * party: amigos que entram na fila separados também aparecem. O corte de 5
 * partidas tira os milhares de aliados aleatórios de uma partida só (a
 * resposta cai de ~210 KB para ~30 KB) — e ninguém com menos que isso é
 * "parceiro frequente". A resposta traz a lista de partidas de cada um, que
 * descartamos.
 */
export async function getFrequentMates(
  accountId: number,
  limit = 5,
): Promise<FrequentMate[]> {
  type RawMate = { mate_id: number; wins: number; matches_played: number };
  let rows: RawMate[];
  try {
    rows = await get<RawMate[]>(
      `/v1/players/${accountId}/mate-stats?min_matches_played=5`,
      600,
    );
  } catch {
    return [];
  }

  const top = rows
    .filter((m) => m.mate_id !== accountId)
    .sort((a, b) => b.matches_played - a.matches_played || b.wins - a.wins)
    .slice(0, limit);
  const profiles = await getProfiles(top.map((m) => m.mate_id));

  return top.map((m) => {
    const profile = profiles.get(m.mate_id);
    return {
      accountId: m.mate_id,
      name: profile?.personaname ?? null,
      avatar: profile?.avatarmedium ?? profile?.avatar ?? null,
      matches: m.matches_played,
      wins: m.wins,
    };
  });
}

function stripProfile(p: SteamProfile & { friends?: unknown }): SteamProfile {
  const { friends: _friends, ...rest } = p;
  return { ...rest, profileurl: safeProfileUrl(rest.profileurl) };
}

export async function getMatchHistory(accountId: number): Promise<MatchHistoryEntry[]> {
  const rows = await get<MatchHistoryEntry[]>(
    `/v1/players/${accountId}/match-history`,
    120,
  );
  return rows.sort((a, b) => b.start_time - a.start_time);
}

export async function getRank(accountId: number): Promise<PlayerRank | null> {
  try {
    return await get<PlayerRank>(`/v1/players/${accountId}/rank`, 300);
  } catch {
    // Jogadores sem partida ranqueada não têm rank; não é erro fatal.
    return null;
  }
}

export async function getHeroStats(accountId: number): Promise<PlayerHeroStats[]> {
  try {
    return await get<PlayerHeroStats[]>(
      `/v1/players/hero-stats?account_ids=${accountId}`,
      300,
    );
  } catch {
    return [];
  }
}

/**
 * Gênero dos heróis que a API deixa em branco. Sinclair (60) é o mágico
 * "The Magnificent Sinclair", tratado no masculino pelo próprio jogo.
 */
const GENDER_FALLBACK: Record<number, string> = { 60: "male" };

/** /v1/assets/heroes responde ~2,5 MB; reduzimos para o mínimo e cacheamos por 24h. */
export const getHeroMap = memoize(86400, async (): Promise<Map<number, Hero>> => {
  type RawHero = {
    id: number;
    name: string;
    images?: Record<string, string | null>;
    colors?: { style_hex?: string | null };
    gender?: string | null;
    hero_type?: string | null;
    gun_tag?: string | null;
    tags?: string[] | null;
    complexity?: number | null;
    class_name?: string | null;
    description?: { role?: string | null } | null;
    starting_stats?: { max_health?: { value?: number } };
  };
  const raw = await get<RawHero[]>("/v1/assets/heroes", "no-store");
  const map = new Map<number, Hero>();
  for (const h of raw) {
    map.set(h.id, {
      id: h.id,
      name: h.name,
      icon: h.images?.icon_image_small_webp ?? h.images?.icon_image_small ?? null,
      card: h.images?.icon_hero_card_webp ?? h.images?.icon_hero_card ?? null,
      background:
        h.images?.background_image_webp ?? h.images?.background_image ?? null,
      portrait:
        h.images?.hero_card_gloat_webp ??
        h.images?.hero_card_gloat ??
        h.images?.icon_hero_card_webp ??
        null,
      styleHex: h.colors?.style_hex ?? null,
      traits: {
        gender: h.gender || GENDER_FALLBACK[h.id] || "",
        role: h.hero_type ?? "",
        weapon: h.gun_tag ?? "",
        tags: h.tags ?? [],
        complexity: h.complexity ?? 0,
        health: h.starting_stats?.max_health?.value ?? 0,
        codename: (h.class_name ?? "").replace(/^hero_/, ""),
        blurb: h.description?.role ?? "",
      },
    });
  }
  return map;
});

export const RANK_TIERS = [
  "Obscurus", "Initiate", "Seeker", "Acolyte", "Sentinel", "Mystic",
  "Ritualist", "Emissary", "Oracle", "Phantom", "Ascendant", "Eternus",
] as const;

export function rankImage(tier: number, subrank: number): string {
  return `${API}/v1/assets/ranks/${tier}/${Math.max(1, subrank)}/image`;
}

/**
 * Herói principal do jogador: o que mais venceu. Vitórias já embutem volume
 * (ninguém acumula vitórias sem jogar), e o desempate vai para quem tem mais
 * partidas. Exige um mínimo de partidas para um 1x1 sortudo não virar capa.
 */
export function pickSignatureHero(
  stats: PlayerHeroStats[],
  minMatches = 5,
): PlayerHeroStats | null {
  const eligible = stats.filter((s) => s.matches_played >= minMatches);
  const pool = eligible.length > 0 ? eligible : stats;
  if (pool.length === 0) return null;

  return [...pool].sort(
    (a, b) => b.wins - a.wins || b.matches_played - a.matches_played,
  )[0];
}

/**
 * Catálogo de itens de loja. /v1/assets/items responde ~8 MB e mistura
 * habilidades de herói (`type: "ability"`) com itens compráveis
 * (`type: "upgrade"`); só os compráveis interessam aqui. Cacheado por 24h.
 */
export const getItemMap = memoize(86400, async (): Promise<Map<number, ItemView>> => {
  type RawItem = {
    id: number;
    name: string;
    type: string;
    class_name?: string | null;
    component_items?: string[] | null;
    item_slot_type?: string | null;
    item_tier?: number | null;
    cost?: number | string | null;
    image?: string | null;
    image_webp?: string | null;
    shop_image?: string | null;
    shop_image_webp?: string | null;
    activation?: string | null;
    description?: { desc?: string | null } | null;
    properties?: Record<string, RawProperty> | null;
    tooltip_sections?: RawSection[] | null;
  };
  type RawProperty = {
    value?: string | number | null;
    label?: string | null;
    prefix?: string | null;
    postfix?: string | null;
    icon?: string | null;
    css_class?: string | null;
    usage_flags?: string[] | null;
  };
  type RawSection = {
    section_type?: string | null;
    section_attributes?: {
      loc_string?: string | null;
      properties?: string[] | null;
      important_properties?: string[] | null;
      elevated_properties?: string[] | null;
    }[];
  };

  const raw = await get<RawItem[]>("/v1/assets/items", "no-store");
  const map = new Map<number, ItemView>();
  // `class_name` é a chave com que o jogo liga um item aos seus componentes.
  const porClasse = new Map<string, number>();

  for (const i of raw) {
    if (i.type !== "upgrade") continue;
    if (i.class_name) porClasse.set(i.class_name, i.id);
    const descricao = parseRichText(i.description?.desc);
    map.set(i.id, {
      id: i.id,
      name: i.name,
      // Nem todo item tem arte de loja: 66 dos 250 caem no ícone alternativo.
      image: i.shop_image_webp ?? i.shop_image ?? i.image_webp ?? i.image ?? null,
      slot: i.item_slot_type ?? "weapon",
      tier: i.item_tier ?? 0,
      cost: Number(i.cost) || 0,
      description: descricao,
      activation: i.activation ?? null,
      sections: buildSections(i.tooltip_sections, i.properties),
      upgradesFrom: [],
      upgradesTo: [],
    });
  }

  /*
   * Caminho de melhoria. O catálogo guarda só um lado da relação — quais itens
   * cada um substitui — e o sentido inverso sai invertendo a mesma lista.
   */
  for (const i of raw) {
    const destino = map.get(i.id);
    if (!destino) continue;
    for (const classe of i.component_items ?? []) {
      const origem = map.get(porClasse.get(classe) ?? -1);
      if (!origem) continue;
      destino.upgradesFrom.push(ref(origem));
      origem.upgradesTo.push(ref(destino));
    }
  }

  return map;

  function ref(item: ItemView): ItemRef {
    return { id: item.id, name: item.name, image: item.image };
  }

  /**
   * Monta as seções do tooltip.
   *
   * `properties` traz ~20 entradas por item, boa parte interna ou com valor
   * sentinela (-1, 0). O próprio jogo já resolve isso: `tooltip_sections` lista
   * quais propriedades exibir e em que ordem, então seguimos essa curadoria em
   * vez de tentar adivinhar quais são relevantes.
   */
  function buildSections(
    sections: RawSection[] | null | undefined,
    properties: Record<string, RawProperty> | null | undefined,
  ): ItemSection[] {
    if (!sections || !properties) return [];

    const textoDe = (t: RichText | null) =>
      (t ?? [])
        .map((parte) => parte.text)
        .join("")
        .trim();
    /*
     * A descrição do item costuma reaparecer palavra por palavra numa seção, e
     * às vezes em mais de uma. A repetição que o cartão precisa evitar é entre
     * seções: a descrição solta só é exibida quando não há seção nenhuma, então
     * compará-la com elas apagaria o texto em vez de desduplicá-lo.
     */
    const jaVistos = new Set<string>();

    const resolve = (chaves: string[] | null | undefined): ItemStat[] =>
      (chaves ?? [])
        .map((chave) => {
          const prop = properties[chave];
          if (!prop?.label || prop.value == null || prop.value === "") return null;

          // Parte dos valores já chega com a unidade ("1.75m", "4m") e o
          // postfix a repetiria — às vezes de forma não óbvia, como "4m" +
          // " m/s" = "4mm/s". Quando o valor termina em letra, ele já traz a
          // própria unidade e o postfix é descartado. Verificado contra o
          // catálogo inteiro: nenhum valor fica com unidade duplicada.
          const bruto = String(prop.value).trim();
          const unidade = (prop.postfix ?? "").trim();
          const jaTemUnidade = /[a-z]$/i.test(bruto);
          const comUnidade =
            unidade && !jaTemUnidade ? bruto + unidade : bruto;

          // `{s:sign}` pede o sinal explícito. O jogo só o aplica a números
          // puros: valores que já chegam formatados com unidade ("0.75m")
          // aparecem sem o "+".
          const pedeSinal = (prop.prefix ?? "").includes("sign");
          const numeroPuro = /^\d/.test(bruto);
          const value =
            pedeSinal && numeroPuro ? "+" + comUnidade : comUnidade;

          return {
            label: prop.label,
            value,
            icon: prop.icon ?? null,
            cssClass: prop.css_class ?? null,
            conditional: (prop.usage_flags ?? []).includes("ConditionallyApplied"),
          };
        })
        .filter((stat): stat is ItemStat => stat !== null);

    return sections
      .flatMap((section) =>
        (section.section_attributes ?? []).map((attr) => {
          const texto = parseRichText(attr.loc_string);
          const bruto = textoDe(texto);
          const repetido = bruto !== "" && jaVistos.has(bruto);
          if (bruto) jaVistos.add(bruto);
          return {
            kind: section.section_type ?? "innate",
            text: repetido ? null : texto,
            important: [
              ...resolve(attr.important_properties),
              ...resolve(attr.elevated_properties),
            ],
            details: resolve(attr.properties),
          };
        }),
      )
      .filter(
        (section) =>
          section.text || section.important.length > 0 || section.details.length > 0,
      );
  }
});

/**
 * Builds do jogador para várias partidas numa única chamada.
 *
 * Buscar `/v1/matches/{id}/metadata` partida a partida custaria ~1,2 MB cada
 * (os 12 jogadores, com séries temporais completas). O endpoint em lote aceita
 * projeção: `only_filtered_players` corta para o jogador pedido e
 * `include_player_items` traz só a build — 20 partidas saem em ~100 KB.
 *
 * Toda partida que a API devolve entra no mapa, mesmo sem itens: a ausência
 * no mapa é o que indica que ela ainda não tem metadata. Devolve `null` se a
 * chamada falhar, para não confundir erro com partida inexistente.
 */
export async function getMatchItems(
  accountId: number,
  matchIds: number[],
  items: Map<number, ItemView>,
): Promise<Map<number, ItemView[]> | null> {
  const result = new Map<number, ItemView[]>();
  if (matchIds.length === 0) return result;

  type BulkMatch = {
    match_id: number;
    players?: {
      account_id: number;
      items?: { item_id: number; game_time_s: number; sold_time_s: number }[];
    }[];
  };

  const query = new URLSearchParams({
    match_ids: matchIds.join(","),
    account_ids: String(accountId),
    only_filtered_players: "true",
    include_player_items: "true",
    limit: String(matchIds.length),
  });

  let rows: BulkMatch[];
  try {
    rows = await get<BulkMatch[]>("/v1/matches/metadata?" + query.toString(), 600);
  } catch {
    // A build é informação acessória: se falhar, a partida ainda aparece.
    return null;
  }

  for (const row of rows) {
    const player = row.players?.find((p) => p.account_id === accountId);
    const seen = new Set<number>();
    const build = (player?.items ?? [])
      // sold_time_s > 0 = item revendido; mostramos a build com que terminou.
      .filter((entry) => !entry.sold_time_s)
      .sort((a, b) => a.game_time_s - b.game_time_s)
      .map((entry) => items.get(entry.item_id))
      .filter((item): item is ItemView => {
        if (!item || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

    result.set(row.match_id, build);
  }
  return result;
}

/**
 * Partidas elegíveis a "melhor partida", da melhor para a pior.
 *
 * Cada partida é comparada com a média do próprio jogador, e não com valores
 * absolutos: 30 mil almas é muito para um suporte e pouco para um carry, e o
 * que interessa é a partida em que ele jogou acima do próprio padrão. Entram
 * três medidas, todas por minuto ou por morte para que uma partida longa não
 * vença só por ter durado mais:
 *   - almas por minuto (quanto farmou);
 *   - KDA (quanto matou e participou sem morrer);
 *   - abates + assistências por minuto (o quanto decidiu lutas).
 * Cada razão tem teto de 3x: sem ele, um 8/0 viraria KDA 8 e decidiria sozinho.
 * Vitória dá 10% de bônus — a melhor partida é, de preferência, uma que valeu.
 *
 * Ficam de fora Street Brawl (economia própria), modos que não são partida de
 * verdade (bots, lobby privado, tutorial), partidas com abandono e as abaixo
 * de 15 minutos, em que um stomp curto infla qualquer média.
 */
function rankMatches(matches: MatchHistoryEntry[]): MatchHistoryEntry[] {
  const MIN_DURATION_S = 15 * 60;
  const RATIO_CAP = 3;

  const eligible = matches.filter(
    (m) =>
      m.game_mode === 1 &&
      (m.match_mode === 1 || m.match_mode === 4) &&
      m.match_duration_s >= MIN_DURATION_S &&
      !m.team_abandoned &&
      !m.abandoned_time_s,
  );
  if (eligible.length === 0) return [];

  const measures = eligible.map((m) => {
    const minutes = m.match_duration_s / 60;
    return {
      match: m,
      soulsPerMin: m.net_worth / minutes,
      kda: (m.player_kills + m.player_assists) / Math.max(1, m.player_deaths),
      fightsPerMin: (m.player_kills + m.player_assists) / minutes,
    };
  });
  const avg = (key: "soulsPerMin" | "kda" | "fightsPerMin") =>
    measures.reduce((sum, x) => sum + x[key], 0) / measures.length || 1;
  const avgSouls = avg("soulsPerMin");
  const avgKda = avg("kda");
  const avgFights = avg("fightsPerMin");
  const ratio = (value: number, mean: number) =>
    Math.min(RATIO_CAP, value / mean);

  return measures
    .map((x) => ({
      match: x.match,
      score:
        (0.4 * ratio(x.soulsPerMin, avgSouls) +
          0.35 * ratio(x.kda, avgKda) +
          0.25 * ratio(x.fightsPerMin, avgFights)) *
        (isWin(x.match) ? 1.1 : 1),
    }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.match);
}

/**
 * Quantas das partidas mais bem colocadas são checadas atrás de metadata.
 * A resposta só traz as que existem (~280 bytes cada), então o custo cresce
 * com o que a API tem, não com o tamanho da lista.
 */
const BEST_CANDIDATES = 200;

/**
 * Melhor partida que tem detalhes na API.
 *
 * O histórico cobre partidas que a API nunca chegou a detalhar — contas antigas
 * ou que não enviam dados costumam ter boa parte sem metadata. Sem ela não há
 * dano, MVP nem accolades, então a melhor partida "de verdade" é a mais bem
 * colocada entre as que têm metadata. Uma consulta em lote sem colunas extras
 * diz quais existem; só a vencedora tem os destaques buscados.
 */
export async function findBestMatch(
  accountId: number,
  matches: MatchHistoryEntry[],
  items: Map<number, ItemView>,
): Promise<{ match: MatchHistoryEntry; highlights: MatchHighlights } | null> {
  const ranked = rankMatches(matches).slice(0, BEST_CANDIDATES);
  if (ranked.length === 0) return null;

  const query = new URLSearchParams({
    match_ids: ranked.map((m) => m.match_id).join(","),
    account_ids: String(accountId),
    only_filtered_players: "true",
    limit: String(ranked.length),
  });
  let available: Set<number>;
  try {
    const rows = await get<{ match_id: number }[]>(
      "/v1/matches/metadata?" + query.toString(),
      3600,
    );
    available = new Set(rows.map((r) => r.match_id));
  } catch {
    return null;
  }

  const match = ranked.find((m) => available.has(m.match_id));
  if (!match) return null;
  const highlights = await getMatchHighlights(match.match_id, accountId, items);
  return highlights ? { match, highlights } : null;
}

/** Estatísticas em que o jogo destaca quem foi o melhor da partida. */
export const HIGHLIGHT_STATS = [
  "kills",
  "assists",
  "netWorth",
  "damage",
  "healing",
  "lastHits",
] as const;
export type HighlightStat = (typeof HIGHLIGHT_STATS)[number];

export type EarnedAccolade = {
  id: number;
  /** Título do jogo, ex. "Killer Instinct" — nome próprio, não traduzido. */
  name: string;
  /** Texto do jogo já com o valor, ex. "12 kills". */
  text: string;
  /** Nível alcançado, de 1 a 3. */
  tier: number;
};

export type MatchHighlights = {
  /** 1 = MVP, 2 e 3 = Key Players; null quando o jogo não o premiou. */
  mvpRank: number | null;
  stats: Record<HighlightStat, number> & { deaths: number; denies: number };
  /** Estatísticas em que o jogador foi o maior entre os 12 — a "estrela" do placar. */
  top: HighlightStat[];
  accolades: EarnedAccolade[];
  items: ItemView[];
};

/**
 * Catálogo de accolades (os prêmios de fim de partida). Pequeno (~10 KB), mas
 * estável entre patches: cache de 24h.
 */
const getAccoladeMap = memoize(86400, async () => {
  type RawAccolade = { id: number; flavor_name: string; description: string };
  const raw = await get<RawAccolade[]>("/v1/assets/accolades", 86400);
  return new Map(raw.map((a) => [a.id, a]));
});

/**
 * Preenche o texto de um accolade. O jogo usa marcadores no formato ICU:
 * `{g:citadel_thousands:stat_value}` é o número e
 * `{stat_value, plural, one{kill} other{kills}}` escolhe singular ou plural.
 */
function accoladeText(template: string, value: number): string {
  return template
    .replace(/<[^>]+>/g, "")
    .replace(/\{g:[^}]*stat_value\}/g, value.toLocaleString("en-US"))
    .replace(
      /\{stat_value,\s*plural,\s*one\{([^}]*)\}\s*other\{([^}]*)\}\}/g,
      (_, one: string, other: string) => (value === 1 ? one : other),
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * MVP, accolades e destaques de uma partida, numa chamada em lote enxuta.
 *
 * A metadata completa (`/v1/matches/{id}/metadata`) pesa ~1,1 MB. Aqui pedimos
 * só as colunas necessárias dos 12 jogadores — o placar inteiro é preciso para
 * saber em que estatística o jogador foi o maior — e a resposta cai para
 * ~30 KB. Dano e cura vêm como série temporal; o último ponto é o total.
 * Devolve null se a partida ainda não tem metadata ou se a chamada falhar.
 */
export async function getMatchHighlights(
  matchId: number,
  accountId: number,
  items: Map<number, ItemView>,
): Promise<MatchHighlights | null> {
  type RawPlayer = {
    account_id: number;
    kills?: number;
    deaths?: number;
    assists?: number;
    net_worth?: number;
    last_hits?: number;
    denies?: number;
    mvp_rank?: number | null;
    stats_player_damage?: number[] | null;
    stats_player_healing?: number[] | null;
    accolades?: {
      accolade_id: number;
      accolade_stat_value: number;
      accolade_threshold_achieved: number;
    }[];
    items?: { item_id: number; game_time_s: number; sold_time_s: number }[];
  };

  const query = new URLSearchParams({
    match_ids: String(matchId),
    include_player_kda: "true",
    include_player_items: "true",
    extra_player_columns:
      "mvp_rank,accolades,net_worth,last_hits,denies,stats.player_damage,stats.player_healing",
    limit: "1",
  });

  let rows: { players?: RawPlayer[] }[];
  let catalog: Awaited<ReturnType<typeof getAccoladeMap>>;
  try {
    [rows, catalog] = await Promise.all([
      // Partida encerrada não muda: cache longo.
      get<{ players?: RawPlayer[] }[]>(
        "/v1/matches/metadata?" + query.toString(),
        86400,
      ),
      getAccoladeMap(),
    ]);
  } catch {
    return null;
  }

  const players = rows[0]?.players ?? [];
  const statsOf = (p: RawPlayer): MatchHighlights["stats"] => ({
    kills: p.kills ?? 0,
    deaths: p.deaths ?? 0,
    assists: p.assists ?? 0,
    netWorth: p.net_worth ?? 0,
    damage: p.stats_player_damage?.at(-1) ?? 0,
    healing: p.stats_player_healing?.at(-1) ?? 0,
    lastHits: p.last_hits ?? 0,
    denies: p.denies ?? 0,
  });
  const all = players.map((p) => ({ id: p.account_id, stats: statsOf(p) }));
  const me = players.find((p) => p.account_id === accountId);
  if (!me) return null;
  const stats = statsOf(me);

  // Empate no topo também ganha a estrela, como no placar do jogo; zero não.
  const top = HIGHLIGHT_STATS.filter(
    (key) =>
      stats[key] > 0 && all.every((other) => other.stats[key] <= stats[key]),
  );

  // -1 = não alcançado; 0, 1 e 2 são os três níveis de cada prêmio.
  const accolades = (me.accolades ?? [])
    .filter((a) => a.accolade_threshold_achieved >= 0)
    .map((a) => {
      const info = catalog.get(a.accolade_id);
      if (!info) return null;
      return {
        id: a.accolade_id,
        name: info.flavor_name,
        text: accoladeText(info.description, a.accolade_stat_value),
        tier: a.accolade_threshold_achieved + 1,
      };
    })
    .filter((a): a is EarnedAccolade => a !== null)
    .sort((a, b) => b.tier - a.tier);

  const seen = new Set<number>();
  const build = (me.items ?? [])
    .filter((e) => !e.sold_time_s)
    .sort((a, b) => a.game_time_s - b.game_time_s)
    .map((e) => items.get(e.item_id))
    .filter((item): item is ItemView => {
      if (!item || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

  return {
    mvpRank: me.mvp_rank ?? null,
    stats,
    top,
    accolades,
    items: build,
  };
}

/** Badge mínimo considerado "elo alto": 91 = Phantom 1 (tier*10 + subrank). */
export const HIGH_SKILL_BADGE = 91;

export type MatchPlayer = {
  accountId: number;
  heroId: number;
  heroName: string;
  heroIcon: string | null;
  team: number;
  lane: number | null;
  kills: number;
  deaths: number;
  assists: number;
  netWorth: number;
  lastHits: number;
  denies: number;
  /** Build com que terminou a partida (itens revendidos já removidos). */
  items: ItemView[];
  /** Tudo que comprou, inclusive o que revendeu — base justa de comparação. */
  purchased: ItemView[];
};

export type MatchDetail = {
  matchId: number;
  winningTeam: number;
  /** "normal" ou "street_brawl" — Street Brawl tem meta de itens próprio. */
  gameMode: string;
  players: MatchPlayer[];
};

/** A API às vezes devolve o time como "Team0"/"Team1" e às vezes como número. */
function teamToNumber(value: unknown): number {
  if (typeof value === "number") return value;
  return String(value).toLowerCase().includes("1") ? 1 : 0;
}

/** Placar completo de uma partida: os 12 jogadores com a build de cada um. */
export async function getMatchDetail(
  matchId: number,
  heroes: Map<number, Hero>,
  items: Map<number, ItemView>,
): Promise<MatchDetail | null> {
  type RawPlayer = {
    account_id: number;
    hero_id: number;
    team: unknown;
    assigned_lane?: number | null;
    kills?: number;
    deaths?: number;
    assists?: number;
    net_worth?: number;
    last_hits?: number;
    denies?: number;
    items?: { item_id: number; game_time_s: number; sold_time_s: number }[];
  };
  type RawMatch = {
    match_id: number;
    winning_team: unknown;
    game_mode?: unknown;
    players?: RawPlayer[];
  };

  const query = new URLSearchParams({
    match_ids: String(matchId),
    include_info: "true",
    include_player_kda: "true",
    include_player_items: "true",
    extra_player_columns: "assigned_lane,net_worth,last_hits,denies",
    limit: "1",
  });

  let rows: RawMatch[];
  try {
    rows = await get<RawMatch[]>("/v1/matches/metadata?" + query.toString(), 3600);
  } catch {
    return null;
  }

  const row = rows[0];
  if (!row?.players) return null;

  // game_mode chega como número (4 = Street Brawl) ou string já nomeada.
  const rawMode = String(row.game_mode ?? "").toLowerCase();
  const gameMode =
    rawMode === "4" || rawMode.includes("brawl") ? "street_brawl" : "normal";

  return {
    matchId: row.match_id,
    winningTeam: teamToNumber(row.winning_team),
    gameMode,
    players: row.players.map((p) => {
      const hero = heroes.get(p.hero_id);
      const seen = new Set<number>();
      const bought = new Set<number>();
      return {
        accountId: p.account_id,
        heroId: p.hero_id,
        heroName: hero?.name ?? `Herói ${p.hero_id}`,
        heroIcon: hero?.icon ?? null,
        team: teamToNumber(p.team),
        lane: p.assigned_lane ?? null,
        kills: p.kills ?? 0,
        deaths: p.deaths ?? 0,
        assists: p.assists ?? 0,
        netWorth: p.net_worth ?? 0,
        lastHits: p.last_hits ?? 0,
        denies: p.denies ?? 0,
        items: (p.items ?? [])
          .filter((e) => !e.sold_time_s)
          .sort((a, b) => a.game_time_s - b.game_time_s)
          .map((e) => items.get(e.item_id))
          .filter((item): item is ItemView => {
            if (!item || seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          }),
        purchased: (p.items ?? [])
          .sort((a, b) => a.game_time_s - b.game_time_s)
          .map((e) => items.get(e.item_id))
          .filter((item): item is ItemView => {
            if (!item || bought.has(item.id)) return false;
            bought.add(item.id);
            return true;
          }),
      };
    }),
  };
}

export type ItemMetaStat = {
  item: ItemView;
  /** Fração dos jogadores da amostra que compraram o item (0-1). */
  pickRate: number;
  winRate: number;
  matches: number;
};

export type BuildAnalysis = {
  /** Aderência média da build ao que o elo alto compra (0-100). */
  score: number;
  /** Nº de partidas de elo alto que formaram a referência. */
  sampleSize: number;
  /** Como a referência foi obtida — o filtro pode relaxar por falta de amostra. */
  scope: "lane" | "matchup" | "hero";
  /** false em Street Brawl: a API não permite recorte por elo nesse modo. */
  highSkill: boolean;
  enemyNames: string[];
  hits: ItemMetaStat[];
  missing: ItemMetaStat[];
  /** Trocas que mais elevam a aderência: sai o item menos adotado, entra o mais adotado. */
  swaps: { out: ItemMetaStat; in: ItemMetaStat }[];
  /** Aderência que a build teria se todas as trocas sugeridas fossem feitas. */
  potentialScore: number;
};

type RawItemStat = { item_id: number; matches: number; wins: number };

async function fetchItemStats(
  params: Record<string, string>,
): Promise<RawItemStat[]> {
  const query = new URLSearchParams({ min_matches: "20", ...params });
  try {
    return await get<RawItemStat[]>(
      "/v1/analytics/item-stats?" + query.toString(),
      21600,
    );
  } catch {
    return [];
  }
}

/**
 * Compara a build do jogador com o que jogadores de elo alto (Phantom+) compram
 * com o mesmo herói contra os mesmos adversários.
 *
 * A referência é buscada do filtro mais específico para o mais genérico, porque
 * o matchup exato pode não ter amostra suficiente:
 *   1. mesmo herói, mesmos inimigos, **mesma lane**;
 *   2. mesmo herói, mesmos inimigos em qualquer lane;
 *   3. mesmo herói apenas.
 *
 * O score é a média do `pickRate` dos itens que o jogador comprou. Usamos
 * adoção em vez de winrate porque o winrate de um item isolado fica sempre
 * perto de 50% e não discrimina nada — adoção mede o quanto a build seguiu o
 * consenso de quem joga bem aquele confronto.
 */
export async function analyzeBuild(
  heroId: number,
  enemyHeroIds: number[],
  enemyNames: string[],
  myItems: ItemView[],
  items: Map<number, ItemView>,
  gameMode = "normal",
): Promise<BuildAnalysis | null> {
  const MIN_SAMPLE = 50;
  const attempts: { scope: BuildAnalysis["scope"]; params: Record<string, string> }[] =
    [];

  if (enemyHeroIds.length > 0) {
    attempts.push({
      scope: "lane",
      params: {
        hero_id: String(heroId),
        enemy_hero_ids: enemyHeroIds.join(","),
        same_lane_filter: "true",
      },
    });
    attempts.push({
      scope: "matchup",
      params: {
        hero_id: String(heroId),
        enemy_hero_ids: enemyHeroIds.join(","),
      },
    });
  }
  attempts.push({ scope: "hero", params: { hero_id: String(heroId) } });

  // Street Brawl não tem badge médio: a API rejeita o filtro de elo nesse modo,
  // então a referência passa a ser o conjunto de jogadores do modo.
  const highSkill = gameMode !== "street_brawl";

  for (const attempt of attempts) {
    const raw = (
      await fetchItemStats({
        ...attempt.params,
        game_mode: gameMode,
        ...(highSkill ? { min_average_badge: String(HIGH_SKILL_BADGE) } : {}),
      })
    ).filter((s) =>
      items.has(s.item_id),
    );
    // O item mais comprado da amostra serve de denominador para o pickRate.
    const sampleSize = Math.max(0, ...raw.map((s) => s.matches));
    if (sampleSize < MIN_SAMPLE) continue;

    const stats = new Map<number, ItemMetaStat>();
    for (const s of raw) {
      const item = items.get(s.item_id);
      if (!item) continue;
      stats.set(s.item_id, {
        item,
        pickRate: s.matches / sampleSize,
        winRate: s.matches > 0 ? s.wins / s.matches : 0,
        matches: s.matches,
      });
    }

    const mine = myItems
      .map((item) => stats.get(item.id))
      .filter((s): s is ItemMetaStat => Boolean(s));

    // Itens que o jogador não comprou, do mais consensual para o menos.
    const owned = new Set(myItems.map((i) => i.id));
    const notOwned = [...stats.values()]
      .filter((s) => !owned.has(s.item.id))
      .sort((a, b) => b.pickRate - a.pickRate);
    const missing = notOwned.slice(0, 6);

    // Nenhuma build real atinge 100% de adoção média: sempre há itens
    // situacionais. Normalizamos pelo teto possível — a média de adoção dos N
    // itens mais consensuais, com N = tamanho da build do jogador — para que
    // 100% signifique "tão convencional quanto uma build pode ser".
    const ceiling = [...stats.values()]
      .sort((a, b) => b.pickRate - a.pickRate)
      .slice(0, mine.length)
      .reduce((sum, s) => sum + s.pickRate, 0);
    const achieved = mine.reduce((sum, s) => sum + s.pickRate, 0);

    // O score é a média de adoção da build, então ele sobe trocando um item
    // pouco adotado por um muito adotado — não apenas somando itens novos.
    // Pareamos o pior item que o jogador levou com o melhor que deixou de fora,
    // enquanto a troca for vantajosa.
    // Só trocamos itens do MESMO tier. No Deadlock o tier é o preço
    // (800/1600/3200/6400), então sugerir um T3 no lugar de um T4 não é
    // melhorar a build: é gastar quase metade das almas e abrir mão do power
    // spike daquele slot. A comparação só é honesta dentro do mesmo orçamento.
    const byTier = new Map<
      number,
      { mine: ItemMetaStat[]; theirs: ItemMetaStat[] }
    >();
    const bucket = (tier: number) => {
      if (!byTier.has(tier)) byTier.set(tier, { mine: [], theirs: [] });
      return byTier.get(tier)!;
    };
    for (const stat of mine) bucket(stat.item.tier).mine.push(stat);
    for (const stat of notOwned) bucket(stat.item.tier).theirs.push(stat);

    const candidates: { out: ItemMetaStat; in: ItemMetaStat; gain: number }[] = [];
    for (const group of byTier.values()) {
      const weakest = [...group.mine].sort((a, b) => a.pickRate - b.pickRate);
      const strongest = [...group.theirs].sort((a, b) => b.pickRate - a.pickRate);
      for (let i = 0; i < Math.min(weakest.length, strongest.length); i++) {
        const delta = strongest[i].pickRate - weakest[i].pickRate;
        if (delta <= 0) break;
        candidates.push({ out: weakest[i], in: strongest[i], gain: delta });
      }
    }

    // Lista completa: toda troca que melhora a aderência entra, para o jogador
    // ver a build inteira revisada e não só os quatro destaques.
    const swaps = candidates
      .sort((a, b) => b.gain - a.gain)
      .map(({ out, in: into }) => ({ out, in: into }));
    const gain = swaps.reduce(
      (sum, swap) => sum + (swap.in.pickRate - swap.out.pickRate),
      0,
    );
    const toScore = (value: number) =>
      mine.length > 0 && ceiling > 0
        ? Math.min(100, Math.round((value / ceiling) * 100))
        : 0;
    const score = toScore(achieved);
    const potentialScore = toScore(achieved + gain);

    return {
      score,
      sampleSize,
      scope: attempt.scope,
      highSkill,
      enemyNames,
      hits: mine.sort((a, b) => b.pickRate - a.pickRate),
      missing,
      swaps,
      potentialScore,
    };
  }
  return null;
}

export type RankAsset = {
  tier: number;
  name: string;
  /** Arte do tier sem subrank — para o tier 0 é o escudo "?" de sem classificação. */
  image: string | null;
};

/**
 * Catálogo de ranks. Usado para o nome oficial do tier e, principalmente, para
 * a arte do tier 0 (Obscurus): a rota /v1/assets/ranks/0/{sub}/image responde
 * 404, então o placeholder precisa vir daqui.
 */
export async function getRankAssets(): Promise<Map<number, RankAsset>> {
  type RawRank = {
    tier: number;
    name: string;
    images?: Record<string, string | null>;
  };
  const map = new Map<number, RankAsset>();
  try {
    const raw = await get<RawRank[]>("/v1/assets/ranks", 86400);
    for (const r of raw) {
      map.set(r.tier, {
        tier: r.tier,
        name: r.name,
        image: r.images?.large_webp ?? r.images?.large ?? null,
      });
    }
  } catch {
    // Sem o catálogo a UI cai no nome local e esconde a arte.
  }
  return map;
}

/**
 * Arte da cidade do menu principal do Deadlock (NYC em preto e branco).
 * URL fixa de propósito: o catálogo /v1/assets/images pesa ~1,3 MB e seria
 * desperdício baixá-lo inteiro só para resolver um endereço estável.
 */
export const CITY_BACKGROUND =
  "https://assets-bucket.deadlock-api.com/assets-api-res/images/main_menu/background_nyc_cityscape_bw.webp";
