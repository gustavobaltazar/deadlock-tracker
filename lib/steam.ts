/**
 * Interpretação do que o usuário digita na busca.
 *
 * Aceita, além do nome: URL de perfil Steam (numérica ou com vanity), SteamID64
 * cru, SteamID3 no formato [U:1:x] e o próprio account_id.
 */

/** Base da conversão SteamID64 <-> account_id (SteamID3). */
const STEAM64_BASE = 76561197960265728n;

export type SteamInput =
  | { kind: "accountId"; accountId: number }
  | { kind: "vanity"; vanity: string }
  | { kind: "text"; text: string };

function fromSteamId64(raw: string): number | null {
  try {
    const id = BigInt(raw);
    const accountId = id - STEAM64_BASE;
    // Fora dessa faixa não é um SteamID64 de perfil individual.
    if (accountId <= 0n || accountId > 0xffffffffn) return null;
    return Number(accountId);
  } catch {
    return null;
  }
}

export function parseSteamInput(raw: string): SteamInput {
  const input = raw.trim();

  // steamcommunity.com/profiles/<steamid64> — com ou sem protocolo
  const profileUrl = input.match(
    /steamcommunity\.com\/profiles\/(\d{17})/i,
  );
  if (profileUrl) {
    const accountId = fromSteamId64(profileUrl[1]);
    if (accountId) return { kind: "accountId", accountId };
  }

  // steamcommunity.com/id/<vanity>
  const vanityUrl = input.match(
    /steamcommunity\.com\/id\/([A-Za-z0-9_-]{2,32})/i,
  );
  if (vanityUrl) return { kind: "vanity", vanity: vanityUrl[1] };

  // SteamID3 textual: [U:1:394482072]
  const steamId3 = input.match(/^\[?U:1:(\d{1,10})\]?$/i);
  if (steamId3) return { kind: "accountId", accountId: Number(steamId3[1]) };

  // SteamID64 cru (17 dígitos)
  if (/^\d{17}$/.test(input)) {
    const accountId = fromSteamId64(input);
    if (accountId) return { kind: "accountId", accountId };
  }

  // account_id cru
  if (/^\d{4,10}$/.test(input)) {
    return { kind: "accountId", accountId: Number(input) };
  }

  return { kind: "text", text: input };
}

/**
 * Resolve um vanity (steamcommunity.com/id/<nome>) para account_id.
 *
 * A Deadlock API não resolve vanity, e o nome do perfil quase nunca é igual ao
 * slug — procurar o slug como nome falharia. A própria Steam expõe o perfil em
 * XML sem exigir chave de API, então usamos essa rota pública.
 */
export async function resolveVanity(vanity: string): Promise<number | null> {
  if (!/^[A-Za-z0-9_-]{2,32}$/.test(vanity)) return null;

  try {
    const res = await fetch(
      `https://steamcommunity.com/id/${encodeURIComponent(vanity)}/?xml=1`,
      {
        headers: { Accept: "application/xml" },
        next: { revalidate: 86400 },
      },
    );
    if (!res.ok) return null;

    const xml = await res.text();
    const match = xml.match(/<steamID64>(\d{17})<\/steamID64>/);
    return match ? fromSteamId64(match[1]) : null;
  } catch {
    return null;
  }
}
