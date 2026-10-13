import Image from "next/image";
import type { Hero, PlayerHeroStats, SteamProfile } from "@/lib/api";
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
  locale,
  t,
}: {
  accountId: number;
  profile: SteamProfile | null;
  signature: PlayerHeroStats | null;
  signatureHero: Hero | undefined;
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
          priority
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
            priority
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

      </div>
    </section>
  );
}
