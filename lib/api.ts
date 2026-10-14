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
};

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
};

/** Partida já enriquecida com os dados do herói, pronta para o cliente. */
export type MatchView = MatchHistoryEntry & {
  heroName: string;
  heroIcon: string | null;
  /** Build final do jogador na partida, em ordem de compra. */
  items: ItemView[];
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
  itemsByMatch?: Map<number, ItemView[]>,
): MatchView[] {
  return matches.map((m) => {
    const hero = heroes.get(m.hero_id);
    return {
      ...m,
      heroName: hero?.name ?? `Herói ${m.hero_id}`,
      heroIcon: hero?.icon ?? null,
      items: itemsByMatch?.get(m.match_id) ?? [],
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

async function get<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Accept: "application/json",
      ...(API_KEY ? { "X-API-KEY": API_KEY } : {}),
    },
    next: { revalidate },
  });
  if (!res.ok) {
    throw new ApiError(`Deadlock API ${res.status} em ${path}`, res.status);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
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

function stripProfile(p: SteamProfile & { friends?: unknown }): SteamProfile {
  const { friends: _friends, ...rest } = p;
  return rest;
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

/** /v1/assets/heroes responde ~1.8MB; reduzimos para o mínimo e cacheamos por 24h. */
export async function getHeroMap(): Promise<Map<number, Hero>> {
  type RawHero = {
    id: number;
    name: string;
    images?: Record<string, string | null>;
    colors?: { style_hex?: string | null };
  };
  const raw = await get<RawHero[]>("/v1/assets/heroes", 86400);
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
    });
  }
  return map;
}

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
 * Catálogo de itens de loja. /v1/assets/items responde ~6 MB e mistura
 * habilidades de herói (`type: "ability"`) com itens compráveis
 * (`type: "upgrade"`); só os compráveis interessam aqui.
 */
export async function getItemMap(): Promise<Map<number, ItemView>> {
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

  const raw = await get<RawItem[]>("/v1/assets/items", 86400);
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
}

/**
 * Builds do jogador para várias partidas numa única chamada.
 *
 * Buscar `/v1/matches/{id}/metadata` partida a partida custaria ~1,2 MB cada
 * (os 12 jogadores, com séries temporais completas). O endpoint em lote aceita
 * projeção: `only_filtered_players` corta para o jogador pedido e
 * `include_player_items` traz só a build — 20 partidas saem em ~100 KB.
 */
export async function getMatchItems(
  accountId: number,
  matchIds: number[],
  items: Map<number, ItemView>,
): Promise<Map<number, ItemView[]>> {
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
    return result;
  }

  for (const row of rows) {
    const player = row.players?.find((p) => p.account_id === accountId);
    if (!player?.items) continue;

    const seen = new Set<number>();
    const build = player.items
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
