/**
 * Internacionalização do SEARCHLOCK.
 *
 * O idioma vive no caminho da URL (/en, /pt) para que buscadores indexem as
 * duas versões separadamente — com um idioma só por URL, metade do público
 * ficaria invisível em buscas.
 *
 * Nomes próprios do jogo (heróis, itens, ranks, Amber Hand / Sapphire Flame,
 * Weapon / Vitality / Spirit) não são traduzidos: a comunidade os usa em inglês
 * nos dois idiomas.
 */

export const locales = ["en", "pt"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Rótulos do seletor de idioma, cada um no próprio idioma. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  pt: "Português",
};

const en = {
  site: {
    tagline: "Rank, match history and per-hero performance for any player.",
    description:
      "Stats, match history, builds and rank for Deadlock players.",
    footer: {
      dataBy: "Data provided by",
      disclaimer: "Unofficial project, not affiliated with Valve.",
    },
  },
  search: {
    placeholder: "Name, account ID or Steam profile link",
    label: "Search player",
    empty: "No player found.",
    unresolvedUrl: "Could not resolve that Steam URL.",
    hint: "Accepts a name, account ID or Steam profile link. Accounts inactive for the last 30 days may not show up in name searches.",
    gamesIn30d: "{n} games / 30d",
  },
  player: {
    unknown: "Player {id}",
    mainHero: "Main hero:",
    mainHeroStats: "{wins}W in {matches} matches ({pct}%)",
    steamProfile: "Steam profile",
    currentRank: "Current rank",
    unranked: "No rank yet",
    unrankedHint: "The rank shows up after placement matches in ranked mode.",
    recentTitle: "Last {n} matches",
    winLetter: "W",
    lossLetter: "L",
    winRate: "win rate",
    avgKda: "average KDA",
    topHeroes: "Most played heroes",
    noHeroes: "No hero data.",
    heroLine: "{matches} games · {kda} KDA",
    matchHistory: "Match history",
    recorded: "{n} recorded",
    activity: "Activity",
    activityRange: "last {n} weeks",
    activityDays: "Played on {n} days",
    activityLess: "Less",
    activityMore: "More",
    mvps: "MVPs",
    mvpKeyPlayer: "{n}× Key Player",
    mvpRate: "MVP in {pct}% of matches",
    mvpTopHero: "Most MVPs with",
    mvpSince:
      "Counted since January 6, 2026, when Valve started recording each match's MVP and Key Players. Rate based on the {n} matches played since then.",
    mates: "Most played with",
    mateLine: "{matches} games together",
    noMates: "No frequent teammates.",
  },
  freshness: {
    lastMatch: "Most recent match on record: {ago} ago.",
    lessThanHour: "less than an hour",
    hours: "{n} hours",
    days: "{n} days",
    staleWarning:
      "Matches played after that may not have been collected yet. The API indexes regular accounts with a delay; for real-time history the account must send its data through the Deadlock API",
    ingestTool: "ingest tool",
  },
  match: {
    win: "Win",
    loss: "Loss",
    kda: "KDA",
    perfectKda: "Perfect",
    level: "Lv {n}",
    souls: "Souls earned in the match",
    lastHits: "{lh} LH · {dn} DN",
    empty: "No matches found for this account.",
    showing: "Showing {n} of {total} matches",
    loadMore: "Load more",
    loading: "Loading…",
    loadError: "Could not load more matches. Try again.",
    endOfHistory: "End of history.",
    loadingDetails: "Loading match details…",
    detailsError: "Failed to load the match.",
  },
  best: {
    title: "Best match",
    subtitle: "top performance out of {n} matches",
    criteria:
      "Picked by souls per minute, KDA and kills + assists per minute, compared with the player's own average. Street Brawl, bots, abandons and matches under 15 minutes are left out.",
    mvp: "MVP",
    keyPlayer: "Key Player",
    topInMatch: "Best in the match among all 12 players",
    kills: "Kills",
    deaths: "Deaths",
    assists: "Assists",
    souls: "Souls",
    perMin: "{n}/min",
    damage: "Damage dealt",
    healing: "Healing",
    lastHits: "Last hits",
    denies: "{n} denies",
    accolades: "Accolades",
    build: "Final build",
  },
  dle: {
    nav: "Deadlockdle",
    tagline: "Daily Deadlock hero guessing games",
    placeholder: "Type a hero name…",
    noMatch: "No hero found.",
    guess: "Guess",
    empty:
      "Guess any hero to start. Each attribute turns green when it matches today's hero, orange when it partly matches and red when it doesn't.",
    columns: {
      hero: "Hero",
      gender: "Gender",
      role: "Role",
      weapon: "Weapon",
      tags: "Tags",
      complexity: "Complexity",
      health: "Health",
      release: "Release",
    },
    gender: { male: "Male", female: "Female" },
    tryOne: "try",
    tryMany: "tries",
    attempts: "Attempts: {n}",
    winTitle: "You got it!",
    winBody: "Today's hero was {hero}. You found it in {n} {tries}.",
    next: "Next hero in",
    yesterday: "Yesterday's hero was",
    share: "Copy result",
    copied: "Copied!",
    legend: "Color guide",
    correct: "Correct",
    partial: "Partial",
    wrong: "Wrong",
    higher: "Higher / newer",
    lower: "Lower / older",
    releaseNote:
      "Release is the first month the hero shows up in matches. Match data starts in August 2024, so the original roster shows that month.",
    error: "Could not check that guess. Try again.",
    newDay: "A new hero is out. Loading the new game…",
    modes: {
      classic: {
        title: "Classic",
        desc: "Guess the hero with clues on every try",
      },
      voice: {
        title: "Voice",
        desc: "Who said that? Guess from a voice line",
      },
      ability: {
        title: "Ability",
        desc: "Guess the hero from an ability icon",
      },
    },
    hub: {
      play: "Play",
      done: "Solved in {n} {tries}",
      inProgress: "{n} {tries} so far",
      soon: "Soon",
      yesterday: "Yesterday:",
      solved: "{n} of {total} modes solved today",
      newHeroes: "New heroes in",
    },
    teaser: {
      badge: "Daily game",
      desc: "Guess today's Deadlock hero from clues or from their voice. A new hero every day.",
      cta: "Play now",
      seeResults: "See today's results",
    },
    voice: {
      prompt: "Who says this?",
      play: "Play line",
      pause: "Pause",
      clip: "Line {n}",
      unlockIn: "in {n} misses",
      hintTitle: "Hint",
      hintLocked: "unlocks in {n} misses",
      empty:
        "Listen to the line and guess which hero said it. Every 3 misses unlocks something new: another line, a text hint, a third line.",
      audioError: "Could not load the audio. Try again.",
      volume: "Volume",
      mute: "Mute",
      unmute: "Unmute",
    },
  },
  build: {
    adherence: "adherence",
    comparedTo: "Compared to",
    highSkill: "Phantom or above players",
    allPlayers: "all players in this mode (Street Brawl has no rank filter)",
    sameHero: "who played the same hero",
    against: "against",
    scope: {
      lane: "same lane",
      matchup: "same matchup",
      hero: "same hero",
    },
    sampleSize: "{n} matches",
    analyzed: "analyzed.",
    disclaimer:
      "The number measures how closely the build followed the consensus for this matchup — it is not a quality score: rare situational items lower adherence without being mistakes.",
    swapsTitle: "To raise adherence, these were the swaps",
    swapsDelta: "adherence would go from {from}% to {to}%",
    swapsNote:
      "Swaps stay within the same tier, because tier is the item's price — we never suggest giving up a T4 for a cheaper item. Even so it is a statistical suggestion: it does not account for synergy with the rest of your build or how the match was going.",
    yourItems: "Your items",
    candidates: "Candidates · most used that you skipped",
    allCommonTaken: "You took every common item for this matchup.",
    columnPickRate: "pick rate",
    columnWinRate: "win %",
    pickRateHelp: "How many players in the sample bought this item",
    winRateHelp:
      "Win rate of the sampled matches in which this item was bought",
  },
  item: {
    passive: "Passive",
    active: "Active",
    souls: "souls",
    upgradesFrom: "Upgrades from",
    upgradesTo: "Upgrades to",
  },
  modes: {
    1: "Normal",
    2: "Private lobby",
    3: "Co-op bots",
    4: "Ranked",
    5: "Server test",
    6: "Tutorial",
    7: "Hero Labs",
    8: "New player",
    brawl: "Street Brawl",
    unknown: "Unknown",
  },
  time: {
    minutesAgo: "{n} min ago",
    hoursAgo: "{n} h ago",
    daysAgo: "{n} d ago",
    monthsAgo: "{n} months ago",
    yearsAgo: "{n} years ago",
  },
  errors: {
    notFoundTitle: "Player not found",
    notFoundBody:
      "There is no data on record for this account. Try searching by Steam profile name.",
    backHome: "Back to home",
    genericTitle: "Something went wrong",
    genericBody:
      "The Deadlock API may be unstable or rate limited right now.",
    retry: "Try again",
    rateLimited: "Too many requests right now. Wait a moment and try again.",
    upstream: "The Deadlock API did not respond. Try again in a moment.",
  },
  language: "Language",
};

/** O dicionário em inglês define o formato; o português precisa cobri-lo todo. */
export type Dictionary = typeof en;

const pt: Dictionary = {
  site: {
    tagline:
      "Rank, histórico de partidas e desempenho por herói de qualquer jogador.",
    description:
      "Estatísticas, histórico de partidas, builds e rank de jogadores de Deadlock.",
    footer: {
      dataBy: "Dados fornecidos pela",
      disclaimer: "Projeto não oficial, sem vínculo com a Valve.",
    },
  },
  search: {
    placeholder: "Nome, ID da conta ou link do perfil Steam",
    label: "Buscar jogador",
    empty: "Nenhum jogador encontrado.",
    unresolvedUrl: "Não foi possível resolver essa URL da Steam.",
    hint: "Aceita nome, ID da conta ou o link do perfil Steam. Contas inativas nos últimos 30 dias podem não aparecer na busca por nome.",
    gamesIn30d: "{n} jogos / 30d",
  },
  player: {
    unknown: "Jogador {id}",
    mainHero: "Herói principal:",
    mainHeroStats: "{wins}V em {matches} partidas ({pct}%)",
    steamProfile: "Perfil Steam",
    currentRank: "Elo atual",
    unranked: "Sem rank ainda",
    unrankedHint:
      "O elo aparece após as partidas de calibração em modo ranqueado.",
    recentTitle: "Últimas {n} partidas",
    winLetter: "V",
    lossLetter: "D",
    winRate: "taxa de vitória",
    avgKda: "KDA médio",
    topHeroes: "Heróis mais jogados",
    noHeroes: "Sem dados de heróis.",
    heroLine: "{matches} jogos · {kda} KDA",
    matchHistory: "Histórico de partidas",
    recorded: "{n} registradas",
    activity: "Atividade",
    activityRange: "últimas {n} semanas",
    activityDays: "Jogou em {n} dias",
    activityLess: "Menos",
    activityMore: "Mais",
    mvps: "MVPs",
    mvpKeyPlayer: "{n}× Key Player",
    mvpRate: "MVP em {pct}% das partidas",
    mvpTopHero: "Mais MVPs com",
    mvpSince:
      "Contados desde 6 de janeiro de 2026, quando a Valve passou a registrar o MVP e os Key Players de cada partida. Taxa sobre as {n} partidas jogadas desde então.",
    mates: "Mais jogou com",
    mateLine: "{matches} jogos juntos",
    noMates: "Sem parceiros frequentes.",
  },
  freshness: {
    lastMatch: "Partida mais recente registrada: {ago} atrás.",
    lessThanHour: "menos de 1 hora",
    hours: "{n} horas",
    days: "{n} dias",
    staleWarning:
      "Partidas jogadas depois disso podem ainda não ter sido coletadas. A API indexa partidas de contas comuns com atraso; para histórico em tempo real, a conta precisa enviar os dados pela",
    ingestTool: "ferramenta de ingest",
  },
  match: {
    win: "Vitória",
    loss: "Derrota",
    kda: "KDA",
    perfectKda: "Perfeito",
    level: "Nv {n}",
    souls: "Almas acumuladas na partida",
    lastHits: "{lh} LH · {dn} DN",
    empty: "Nenhuma partida encontrada para esta conta.",
    showing: "Exibindo {n} de {total} partidas",
    loadMore: "Carregar mais",
    loading: "Carregando…",
    loadError: "Não foi possível carregar mais partidas. Tente de novo.",
    endOfHistory: "Fim do histórico.",
    loadingDetails: "Carregando detalhes da partida…",
    detailsError: "Falha ao carregar a partida.",
  },
  best: {
    title: "Melhor partida",
    subtitle: "melhor desempenho em {n} partidas",
    criteria:
      "Escolhida por almas por minuto, KDA e abates + assistências por minuto, comparados com a média do próprio jogador. Street Brawl, bots, abandonos e partidas com menos de 15 minutos ficam de fora.",
    mvp: "MVP",
    keyPlayer: "Key Player",
    topInMatch: "Maior da partida entre os 12 jogadores",
    kills: "Abates",
    deaths: "Mortes",
    assists: "Assistências",
    souls: "Almas",
    perMin: "{n}/min",
    damage: "Dano causado",
    healing: "Cura",
    lastHits: "Last hits",
    denies: "{n} denies",
    accolades: "Accolades",
    build: "Build final",
  },
  dle: {
    nav: "Deadlockdle",
    tagline: "Jogos diários de adivinhar heróis do Deadlock",
    placeholder: "Digite o nome de um herói…",
    noMatch: "Nenhum herói encontrado.",
    guess: "Chutar",
    empty:
      "Chute qualquer herói para começar. Cada atributo fica verde quando bate com o herói de hoje, laranja quando bate em parte e vermelho quando não bate.",
    columns: {
      hero: "Herói",
      gender: "Gênero",
      role: "Função",
      weapon: "Arma",
      tags: "Tags",
      complexity: "Complexidade",
      health: "Vida",
      release: "Lançamento",
    },
    gender: { male: "Masculino", female: "Feminino" },
    tryOne: "tentativa",
    tryMany: "tentativas",
    attempts: "Tentativas: {n}",
    winTitle: "Acertou!",
    winBody: "O herói de hoje era {hero}. Você acertou em {n} {tries}.",
    next: "Próximo herói em",
    yesterday: "O herói de ontem era",
    share: "Copiar resultado",
    copied: "Copiado!",
    legend: "Legenda",
    correct: "Correto",
    partial: "Parcial",
    wrong: "Incorreto",
    higher: "Maior / mais recente",
    lower: "Menor / mais antigo",
    releaseNote:
      "Lançamento é o primeiro mês em que o herói aparece nas partidas. Os dados começam em agosto de 2024, então o elenco original aparece nesse mês.",
    error: "Não foi possível conferir o palpite. Tente de novo.",
    newDay: "Saiu um herói novo. Carregando o jogo de hoje…",
    modes: {
      classic: {
        title: "Clássico",
        desc: "Adivinhe o herói com pistas a cada tentativa",
      },
      voice: {
        title: "Voz",
        desc: "Quem falou isso? Adivinhe pela fala do herói",
      },
      ability: {
        title: "Habilidade",
        desc: "Adivinhe o herói pelo ícone de uma habilidade",
      },
    },
    hub: {
      play: "Jogar",
      done: "Resolvido em {n} {tries}",
      inProgress: "{n} {tries} até agora",
      soon: "Em breve",
      yesterday: "Ontem:",
      solved: "{n} de {total} modos resolvidos hoje",
      newHeroes: "Novos heróis em",
    },
    teaser: {
      badge: "Jogo diário",
      desc: "Adivinhe o herói do Deadlock de hoje pelas pistas ou pela voz dele. Um herói novo todo dia.",
      cta: "Jogar agora",
      seeResults: "Ver resultados de hoje",
    },
    voice: {
      prompt: "Quem diz isso?",
      play: "Tocar fala",
      pause: "Pausar",
      clip: "Fala {n}",
      unlockIn: "em {n} erros",
      hintTitle: "Dica",
      hintLocked: "libera em {n} erros",
      empty:
        "Ouça a fala e chute qual herói disse. A cada 3 erros, algo novo é liberado: outra fala, uma dica em texto, uma terceira fala.",
      audioError: "Não foi possível carregar o áudio. Tente de novo.",
      volume: "Volume",
      mute: "Silenciar",
      unmute: "Ativar som",
    },
  },
  build: {
    adherence: "aderência",
    comparedTo: "Comparado a",
    highSkill: "jogadores Phantom ou acima",
    allPlayers:
      "todos os jogadores do modo (Street Brawl não tem recorte de elo)",
    sameHero: "que jogaram o mesmo herói",
    against: "contra",
    scope: {
      lane: "mesma lane",
      matchup: "mesmo confronto",
      hero: "mesmo herói",
    },
    sampleSize: "{n} partidas",
    analyzed: "analisadas.",
    disclaimer:
      "O número mede o quanto a build seguiu o consenso desse confronto — não é nota de qualidade: itens situacionais raros derrubam a aderência sem serem erro.",
    swapsTitle: "Para subir a aderência, estas eram as trocas",
    swapsDelta: "aderência iria de {from}% para {to}%",
    swapsNote:
      "Trocas só dentro do mesmo tier, porque o tier é o preço do item — nunca sugerimos abrir mão de um T4 por um item mais barato. Ainda assim é sugestão estatística: não considera a sinergia com o resto da sua build nem o rumo da partida.",
    yourItems: "Seus itens",
    candidates: "Candidatos · mais usados que você não levou",
    allCommonTaken: "Você levou todos os itens mais comuns do confronto.",
    columnPickRate: "adoção",
    columnWinRate: "vitór.",
    pickRateHelp: "Quantos dos jogadores da amostra compraram este item",
    winRateHelp:
      "Taxa de vitória das partidas da amostra em que este item foi comprado",
  },
  item: {
    passive: "Passivo",
    active: "Ativo",
    souls: "almas",
    upgradesFrom: "Evolui de",
    upgradesTo: "Evolui para",
  },
  modes: {
    1: "Normal",
    2: "Lobby privado",
    3: "Contra bots",
    4: "Ranqueada",
    5: "Teste",
    6: "Tutorial",
    7: "Hero Labs",
    8: "Novo jogador",
    brawl: "Street Brawl",
    unknown: "Desconhecido",
  },
  time: {
    minutesAgo: "{n} min atrás",
    hoursAgo: "{n} h atrás",
    daysAgo: "{n} d atrás",
    monthsAgo: "{n} meses atrás",
    yearsAgo: "{n} anos atrás",
  },
  errors: {
    notFoundTitle: "Jogador não encontrado",
    notFoundBody:
      "Não há dados registrados para essa conta. Tente buscar pelo nome do perfil Steam.",
    backHome: "Voltar ao início",
    genericTitle: "Algo deu errado",
    genericBody:
      "A Deadlock API pode estar instável ou com limite de requisições atingido.",
    retry: "Tentar novamente",
    rateLimited: "Muitas requisições agora. Aguarde um instante e tente de novo.",
    upstream: "A Deadlock API não respondeu. Tente de novo em instantes.",
  },
  language: "Idioma",
};

const dictionaries: Record<Locale, Dictionary> = { en, pt };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

/**
 * Texto para um código de erro das rotas de API. O servidor nunca manda a
 * mensagem pronta: ela sairia num idioma só e poderia expor detalhes internos.
 */
export function apiErrorMessage(
  code: string | undefined,
  t: Dictionary,
  fallback: string,
): string {
  switch (code) {
    case "rate_limited":
      return t.errors.rateLimited;
    case "unresolved_url":
      return t.search.unresolvedUrl;
    case "upstream":
      return t.errors.upstream;
    default:
      return fallback;
  }
}

/** Substitui marcadores {chave} por valores. */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );
}

/** Locale do navegador, usado quando o visitante ainda não escolheu. */
export function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const preferred = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase());
  for (const lang of preferred) {
    if (lang.startsWith("pt")) return "pt";
    if (lang.startsWith("en")) return "en";
  }
  return defaultLocale;
}
