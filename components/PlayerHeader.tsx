import Image from "next/image";
import StarIcon from "./StarIcon";
import type { Hero, MvpSummary, PlayerHeroStats, SteamProfile } from "@/lib/api";
import { percent } from "@/lib/format";
import { fill, type Dictionary, type Locale } from "@/lib/i18n";

/**
 * Cabeçalho com a identidade visual do herói principal do jogador.
 *
 * A arte é composta em duas camadas porque o `background_image` da Valve traz
 * só grafismo (sem o personagem) e o `hero_card_gloat` traz o personagem
 * recortado com canal alpha:
 *   1. fundo abstrato do herói, `object-cover` (recorta, nunca estica);
 *   2. véu escuro tingido na cor oficial do herói, para o texto manter contraste;
 *   3. retrato do personagem à direita, `object-contain` e ancorado na base, que
 *      preserva a proporção 280x380 original em qualquer largura de tela.
 */
export default function PlayerHeader({
  accountId,
  profile,
  signature,
  signatureHero,
  mvps,
  mvpHero,
  locale,
  t,
}: {
  accountId: number;
  profile: SteamProfile | null;
  signature: PlayerHeroStats | null;
  signatureHero: Hero | undefined;
  mvps: MvpSummary | null;
  /** Herói com mais MVPs do jogador. */
  mvpHero: Hero | undefined;
  locale: Locale;
  t: Dictionary;
}) {
  const tint = signatureHero?.styleHex ?? "#c6a269";

  return (
    <section
      className="relative mb-5 min-h-[200px] overflow-hidden rounded-lg border border-border bg-surface"
      style={{ borderColor: `${tint}55` }}
    >
      {signatureHero?.background && (
        <Image
          src={signatureHero.background}
          alt=""
          fill
          preload
          sizes="(max-width: 1100px) 100vw, 1100px"
          className="object-cover object-center opacity-70"
        />
      )}

      {signatureHero?.portrait && (
        <div className="pointer-events-none absolute inset-y-0 right-8 hidden w-[240px] sm:block">
          <Image
            src={signatureHero.portrait}
            alt={signatureHero.name}
            width={280}
            height={380}
            preload
            className="ml-auto h-full w-full object-contain object-bottom opacity-95 drop-shadow-2xl"
            style={{
              maskImage:
                "linear-gradient(to right, transparent 0%, black 35%), linear-gradient(to top, transparent 2%, black 20%)",
              maskComposite: "intersect",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 35%), linear-gradient(to top, transparent 2%, black 20%)",
              WebkitMaskComposite: "source-in",
            }}
          />
        </div>
      )}

      {/* Véu: escuro e opaco à esquerda (onde fica o texto), abrindo para a arte. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(100deg, rgba(16,19,13,0.97) 0%, rgba(16,19,13,0.9) 30%, rgba(16,19,13,0.45) 55%, ${tint}22 100%)`,
        }}
      />

      <div className="relative flex flex-wrap items-center gap-4 p-5">
        {profile?.avatarfull ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarfull}
            alt=""
            className="size-20 rounded-lg border-2 bg-surface-2"
            style={{ borderColor: `${tint}cc` }}
          />
        ) : (
          <span className="size-20 rounded-lg bg-surface-2" />
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold drop-shadow-lg">
            {profile?.personaname ?? fill(t.player.unknown, { id: accountId })}
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            account_id {accountId}
            {profile?.realname ? ` · ${profile.realname}` : ""}
          </p>

          {signature && signatureHero && (
            <p className="mt-1.5 text-xs drop-shadow">
              <span className="text-muted">{t.player.mainHero} </span>
              <span className="font-bold" style={{ color: tint }}>
                {signatureHero.name}
              </span>
              <span className="text-eggshell">
                {" · "}
                {fill(t.player.mainHeroStats, {
                  wins: signature.wins,
                  matches: signature.matches_played,
                  pct: percent(signature.wins, signature.matches_played),
                })}
              </span>
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {profile?.profileurl && (
              <a
                href={profile.profileurl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border bg-bg/85 px-3 py-1.5 text-xs text-accent backdrop-blur-sm hover:border-accent"
              >
                {t.player.steamProfile} ↗
              </a>
            )}
          </div>

        </div>

        {mvps && <MvpMedal mvps={mvps} hero={mvpHero} t={t} />}
      </div>
    </section>
  );
}

/** Dourado das almas (gold_color), o mesmo dos destaques da melhor partida. */
const GOLD = "#ffed79";

/**
 * Total de MVPs do jogador, em destaque no cabeçalho. Fica à esquerda do
 * retrato do herói (que ocupa ~260px à direita a partir de `sm`) e desce para
 * baixo do nome no celular.
 */
function MvpMedal({
  mvps,
  hero,
  t,
}: {
  mvps: MvpSummary;
  hero: Hero | undefined;
  t: Dictionary;
}) {
  return (
    <div
      className="flex w-full cursor-help items-center gap-3 rounded-lg border bg-bg/85 px-3.5 py-2.5 backdrop-blur-sm sm:mr-[250px] sm:w-auto"
      style={{
        borderColor: `${GOLD}55`,
        boxShadow: `0 0 24px -8px ${GOLD}55, inset 0 0 18px -10px ${GOLD}88`,
      }}
      title={fill(t.player.mvpSince, { n: mvps.rated })}
    >
      {/* Medalha: estrela sobre um disco dourado com brilho. */}
      <div
        className="grid size-12 shrink-0 place-items-center rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 30%, ${GOLD}, #c6a269 60%, #92703c)`,
          boxShadow: `0 0 14px ${GOLD}66`,
        }}
      >
        <StarIcon className="size-7 text-bg drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]" />
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-3xl font-extrabold leading-none tabular-nums"
            style={{ color: GOLD, textShadow: `0 0 12px ${GOLD}55` }}
          >
            {mvps.mvp}
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-accent">
            {t.player.mvps}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-eggshell">
          {fill(t.player.mvpRate, { pct: percent(mvps.mvp, mvps.rated) })}
          <span className="text-muted">
            {" · "}
            {fill(t.player.mvpKeyPlayer, { n: mvps.keyPlayer })}
          </span>
        </div>
        {mvps.topHero && hero && (
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
            {t.player.mvpTopHero}
            {hero.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero.icon} alt="" className="size-4 rounded-sm" />
            )}
            <span className="font-semibold" style={{ color: hero.styleHex ?? undefined }}>
              {hero.name}
            </span>
            <span className="tabular-nums">({mvps.topHero.count})</span>
          </div>
        )}
      </div>
    </div>
  );
}
