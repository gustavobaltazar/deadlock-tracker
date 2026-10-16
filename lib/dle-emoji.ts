/**
 * Modo Emojis do Deadlockdle: o herói do dia é descrito por cinco emojis —
 * habilidades, visual, manias. O jogo começa com um só; cada erro revela o
 * próximo. É a versão Deadlock do modo Emoji do Loldle.
 *
 * Os conjuntos são escritos à mão, sempre do mais vago para o mais revelador:
 * o primeiro emoji sozinho deve deixar dúvida, e o último praticamente entrega.
 */
import { DLE_SALT, getDlePool, heroOfDay, type DleHero } from "./dle";

/** Emojis mostrados por partida. */
export const EMOJI_COUNT = 5;

/** Conjunto de cada herói, por id. Herói sem conjunto fica fora do modo. */
const HERO_EMOJIS: Record<number, string[]> = {
  // Infernus: jaqueta de couro, Napalm, "Burn Rubber", Concussive Combustion.
  1: ["🧥", "🛢️", "🏍️", "💥", "🔥"],
  // Seven: Storm Cloud, Lightning Ball, Power Surge.
  2: ["☁️", "⚾", "🔌", "⚡", "7️⃣"],
  // Vindicta: Flight, Crow Familiar (sangramento), Stake, Assassinate.
  3: ["🪽", "🩸", "📍", "🐦", "🎯"],
  // Lady Geist: vaidade, Soul Exchange, Life Drain, Essence Bomb, fantasma.
  4: ["💄", "🔄", "🩸", "💣", "👻"],
  // Abrams: detetive, Siphon Life, Seismic Impact, cabeça-dura, brigão.
  6: ["🕵️", "🫀", "☄️", "🐂", "💪"],
  // Wraith: jogatina, Telekinesis, Full Auto, Project Mind, Card Trick.
  7: ["🎲", "🧠", "🔫", "🌀", "🃏"],
  // McGinnis: Spectral Wall, Medicinal Specter, Heavy Barrage, inventora, torreta.
  8: ["🧱", "👻", "🚀", "🔧", "🤖"],
  // Paradox: Paradoxical Swap, Pulse Grenade, Time Wall, Kinetic Carbine.
  10: ["🔀", "💣", "🧱", "⏱️", "⏳"],
  // Dynamo: Rejuvenating Aurora, cura, Quantum Entanglement, Singularity.
  11: ["🌈", "🩹", "⚛️", "🌌", "🕳️"],
  // Kelvin: barbudo explorador, Ice Path, Frozen Shelter, Frost Grenade.
  12: ["🧔", "🏔️", "🛷", "🧊", "❄️"],
  // Haze: óculos escuros, Smoke Bomb, Sleep Dagger, Bullet Dance.
  13: ["🕶️", "💨", "😴", "🗡️", "💃"],
  // Holliday: Bounce Pad, Powder Keg, Spirit Lasso (arrasta), Crackshot, xerife.
  14: ["🦘", "🛢️", "🐎", "🎯", "🤠"],
  // Bebop: Hyper Beam, Sticky Bomb, Exploding Uppercut, Grapple Arm, robô.
  15: ["📡", "💣", "🥊", "🪝", "🤖"],
  // Calico: Return to Shadows, Gloom Bombs, Leaping Slash, Ava, gata.
  16: ["🌑", "💣", "🗡️", "🐾", "🐈‍⬛"],
  // Grey Talon: Spirit Snare, Rain of Arrows, Charged Shot, Guided Owl, arco.
  17: ["🪤", "🌧️", "🎯", "🦉", "🏹"],
  // Mo & Krill: dupla, Combo, areia, Sand Blast, Burrow.
  18: ["👯", "👊", "🏜️", "🌪️", "🕳️"],
  // Shiv: Rage, Bloodletting, Slice and Dice, Killing Blow, facas.
  19: ["😡", "🩸", "🌀", "💀", "🔪"],
  // Ivy: dupla com um aliado, Air Drop, Entangling Thorns, Stone Form, gárgula.
  20: ["🤝", "🪂", "🌿", "🗿", "🦇"],
  // Warden: Binding Word, Willpower, Alchemical Flask, correntes, guarda.
  25: ["📜", "🛡️", "⚗️", "⛓️", "👮"],
  // Yamato: Shadow Transformation, Crimson Slash, quimono, Japão, katana.
  27: ["🌑", "🩸", "👘", "🗾", "⚔️"],
  // Lash: arrogante, Grapple, Death Slam (levanta), Ground Strike, chicote.
  31: ["😏", "🧗", "🏋️", "💥", "🪢"],
  // Viscous: The Cube, Puddle Punch, Goo Ball, Splatter, gosma.
  35: ["🎲", "👊", "⚽", "🫠", "🟢"],
  // Pocket: Flying Cloak, Barrage (plana), sapos, nuvem, Enchanter's Satchel.
  50: ["🧥", "🪂", "🐸", "☁️", "🧳"],
  // Mirage: Traveler, deserto, Dust Devil, Fire Scarabs, djinn.
  52: ["🧭", "🏜️", "🌪️", "🪲", "🧞"],
  // Vyper: Slither, Screwjab Dagger, Petrifying Bola, Lethal Venom, cobra.
  58: ["🛝", "🗡️", "🗿", "🧪", "🐍"],
  // Sinclair: palco, Spectral Assistant, magia, cartola, Rabbit Hex.
  60: ["🎭", "🧑‍🤝‍🧑", "🪄", "🎩", "🐇"],
  // Mina: casamento arranjado, Love Bites, noite, Nox Nostra (morcegos), vampira.
  63: ["💍", "💋", "🌙", "🦇", "🧛‍♀️"],
  // Drifter: andarilho, Stalker's Mark, Rend, Eternal Night, vampiro.
  64: ["🛤️", "🎯", "🩸", "🌑", "🧛"],
  // Venator: caçador de vampiros, Snap Trap, Consecrating Grenade, Vaticano.
  65: ["🧄", "🪤", "🔥", "⛪", "✝️"],
  // Victor: acordou num necrotério, Pain Battery, Aura of Suffering, choque, Frankenstein.
  66: ["🏥", "🔋", "😖", "⚡", "🧟‍♂️"],
  // Paige: Plot Armor, Rallying Charge, Bookwyrm, livros.
  67: ["🛡️", "🐎", "🐉", "📚", "📖"],
  // The Doorman: Luggage Cart, elevador, Hotel Guest, Doorway, Call Bell.
  69: ["🛒", "🛗", "🏨", "🚪", "🛎️"],
  // Billy: punk, Chain Gang, taco, Rising Ram, G.O.A.T.
  72: ["🤘", "⛓️", "⚾", "🐏", "🐐"],
  // Graves: família de advogados, Grasping Hands, Jar of Dead, Deadheads, cemitério.
  76: ["⚖️", "🖐️", "🏺", "🧟", "🪦"],
  // Apollo: Itani Lo Sahn (câmera lenta), Disengaging Sigil, estocadas, esgrima.
  77: ["🐌", "🔯", "🗡️", "⚜️", "🤺"],
  // Deadman Danny: Close The Deal, vendedor, Jettison Fuel, mísseis, jetpack.
  78: ["🤝", "💼", "⛽", "🚀", "🧑‍🚀"],
  // Rem: Lil Helpers (caixas), pelúcia, sonhos, Naptime, Pillow Toss.
  79: ["📦", "🧸", "🌙", "🛏️", "💤"],
  // Silver: bebe demais, fuma demais, Boot Kick, lua cheia, Lycan Curse.
  80: ["🍺", "🚬", "👢", "🌕", "🐺"],
  // Celeste: Dazzling Trick (prisma), Light Eater, artista, brilho, unicórnio.
  81: ["💎", "🔦", "🎪", "✨", "🦄"],
  // Rat King: Scrap Grenade, Rule Ratannia! (estandarte), Royal Pestments, coroa, ratos.
  84: ["🗑️", "🚩", "🛡️", "👑", "🐀"],
  // Solomon: conselheiro, Kingside Knight, Rook Battery, rei, xadrez.
  85: ["🤔", "🐴", "🏰", "👑", "♟️"],
  // Baba: Granny Long Legs (banco), Threadsap, Baba's Brew, Feed The Birds, vovó.
  88: ["🪑", "🧶", "🍵", "🍞", "👵"],
};

export type EmojiDay = { hero: DleHero; pool: DleHero[]; emojis: string[] };

export async function emojiOfDay(day: string): Promise<EmojiDay> {
  const pool = (await getDlePool()).filter((h) => HERO_EMOJIS[h.id]?.length === EMOJI_COUNT);
  const hero = heroOfDay(pool, day, DLE_SALT.emoji);
  return { hero, pool, emojis: HERO_EMOJIS[hero.id] };
}
