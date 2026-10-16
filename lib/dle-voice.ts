/**
 * Modo Voz do Deadlockdle: o jogador ouve falas do herói do dia e adivinha
 * quem falou. É a versão Deadlock do modo "Quote" do Loldle — a API não tem as
 * falas em texto, mas tem o áudio de todas elas.
 */
import { get, memoize } from "./api";
import { DLE_SALT, getDlePool, heroOfDay, seeded, type DleHero } from "./dle";

/**
 * Situações cujas falas servem para o jogo. Ficam de fora gemidos de dor,
 * esforço e emotes (sem palavras), pings (citam itens e objetivos, não o
 * personagem) e falas de seleção, que costumam dizer o próprio nome do herói.
 * Falas sobre aliados (`_ally_`) também saem: comentam a habilidade de outro
 * herói e soam como a voz dele, não a de quem fala.
 */
const LINE = /_(happy|angry|sad|concerned|close_call|congrats|leave_base|killstreak_start|respawn|kill_[a-z]+)_\d+$/;

/** Falas mínimas para o herói entrar no modo Voz. */
const MIN_LINES = 10;

/** Quantas falas o jogo do dia usa: a inicial e as que a pessoa desbloqueia. */
export const VOICE_CLIPS = 3;

/**
 * Falas elegíveis de cada herói, por nome interno ("atlas" = Abrams).
 *
 * O catálogo de sons tem ~18 MB e ~128 mil arquivos; guardamos só a lista de
 * URLs das falas que interessam, em memória, por 24h.
 */
const getVoiceLines = memoize(86400, async () => {
  type Tree = { [key: string]: string | Tree };
  const sounds = await get<{ vo?: Tree }>("/v1/assets/sounds", "no-store");
  const lines = new Map<string, string[]>();
  for (const [codename, node] of Object.entries(sounds.vo ?? {})) {
    if (typeof node !== "object") continue;
    const urls = Object.entries(node)
      .filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" &&
          LINE.test(entry[0]) &&
          !entry[0].includes("_ally_") &&
          !entry[0].includes("test"),
      )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, url]) => url);
    if (urls.length >= MIN_LINES) lines.set(codename, urls);
  }
  return lines;
});

export type VoiceDay = { hero: DleHero; clips: string[]; pool: DleHero[] };

/**
 * Herói e falas de um dia. As falas são sorteadas com a mesma semente do dia,
 * então todo mundo ouve exatamente as mesmas três, na mesma ordem.
 */
export async function voiceOfDay(day: string): Promise<VoiceDay> {
  const [all, lines] = await Promise.all([getDlePool(), getVoiceLines()]);
  const pool = all.filter((h) => lines.has(h.traits.codename));
  const hero = heroOfDay(pool, day, DLE_SALT.voice);
  const available = [...(lines.get(hero.traits.codename) ?? [])];

  const dayNumber = Math.floor(Date.parse(day + "T00:00:00Z") / 86_400_000);
  const random = seeded(dayNumber * 40503 + DLE_SALT.voice);
  const clips: string[] = [];
  while (clips.length < VOICE_CLIPS && available.length > 0) {
    clips.push(available.splice(Math.floor(random() * available.length), 1)[0]);
  }
  return { hero, clips, pool };
}
