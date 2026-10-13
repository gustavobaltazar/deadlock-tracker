# SEARCHLOCK

Stats tracker for [Deadlock](https://store.steampowered.com/app/1422450/Deadlock/):
player search, match history, builds, and a comparison between your build and what
high-rank players run in the same matchup.

Available in English and Portuguese. Unofficial project, not affiliated with Valve.
Data comes from the community-run [Deadlock API](https://deadlock-api.com).

## Features

- **Flexible search** — Steam name, account ID, SteamID64, SteamID3 or the profile
  link (`/profiles/<id>` and `/id/<vanity>`), with no Steam Web API key required.
- **Player profile** — current rank, most played heroes, win rate and KDA for recent
  matches, with the header themed after the hero the player wins the most with.
- **Paginated history** — every match the API knows about, each with its build.
- **Match detail** — all 12 players, their builds and the teams.
- **Build analysis** — compares what you bought against what Phantom-or-above players
  buy on the same hero, against the same opponents, in the same lane; then suggests
  swaps within the same tier.
- **Bilingual** — English and Portuguese, with the language in the URL (`/en`, `/pt`)
  so both versions can be indexed.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4

Route Handlers act as the server layer: they avoid CORS, cache the API catalogues and
shrink large payloads before they reach the browser.

## Running locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. No environment variables or credentials are required —
every endpoint used is public.

## Deploy

The project runs with no environment variables. Two are optional in production
(see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `DEADLOCK_API_KEY` | Raises Deadlock API limits. Without it, limits apply per IP — and in production the server IP is shared by every visitor. |
| `NEXT_PUBLIC_SITE_URL` | Public URL used in sharing metadata. Detected automatically on Vercel. |

The tightest endpoint is `/v1/matches/metadata`: **30 req/min per IP** against
**30 req/10s with a key**. Responses are cached server-side, so visits to the same
player do not repeat the call.

## Notes on the data

Upstream behaviours that affect what shows up on screen:

- **Recent matches may be missing.** The API only indexes matches from regular
  accounts after a delay of hours to days. Real-time data requires the account to be a
  "bot friend" (a paid API perk) or to use their
  [ingest tool](https://deadlock-api.com/ingest-cache). The UI shows how long ago the
  most recent recorded match was.
- **A win** is `match_result === player_team` — `match_result` is the winning team, not
  a boolean.
- **Build adherence is not a quality score.** It measures how closely a build followed
  the consensus for that matchup; rare situational items lower it without being
  mistakes.
- **Item tier is price** (800 / 1600 / 3200 / 6400), which is why swap suggestions
  never cross tiers.

## Localization

UI strings live in `lib/i18n.ts`, one dictionary per language. The English dictionary
defines the shape, so TypeScript flags any key missing from the other languages.

Proper nouns from the game — heroes, items, ranks, Amber Hand / Sapphire Flame,
Weapon / Vitality / Spirit — are intentionally left untranslated, since the community
uses the English terms in both languages.

## License

Deadlock assets belong to Valve.
