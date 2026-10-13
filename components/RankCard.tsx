import type { PlayerRank, RankAsset } from "@/lib/api";
import { RANK_TIERS, rankImage } from "@/lib/api";

/**
 * Bloco de elo do jogador.
 *
 * Quando não há rank, mostramos o escudo "?" do tier 0 (Obscurus) — é o próprio
 * asset de "sem classificação" do jogo — esmaecido e com um fade na base, para
 * ler como espaço vazio à espera de preenchimento, não como um rank de verdade.
 */
export default function RankCard({
  rank,
  placeholder,
}: {
  rank: PlayerRank | null;
  placeholder: RankAsset | undefined;
}) {
  const ranked = rank != null && rank.badge > 0;

  return (
    <section className="rounded-lg border border-border bg-surface">
      <h2 className="border-b border-border px-3 py-2.5 text-sm font-bold">
        Elo atual
      </h2>

      <div className="flex flex-col items-center px-3 py-5">
        {ranked ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rankImage(rank.rank, rank.subrank)}
              alt=""
              className="h-24 w-auto drop-shadow-lg"
            />
            <div className="mt-2 text-lg font-bold">
              {RANK_TIERS[rank.rank] ?? `Tier ${rank.rank}`}
              {rank.rank > 0 && rank.rank < 11 ? ` ${rank.subrank}` : ""}
            </div>
          </>
        ) : (
          <>
            {placeholder?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={placeholder.image}
                alt=""
                className="h-24 w-auto"
                style={{
                  // O escudo do tier 0 é quase preto; sem clarear, ele some no
                  // fundo escuro do card. Brilho alto + opacidade média deixa a
                  // silhueta legível sem competir com um rank de verdade.
                  filter: "brightness(2.6)",
                  opacity: 0.55,
                  maskImage:
                    "linear-gradient(to bottom, black 50%, transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, black 50%, transparent 100%)",
                }}
              />
            ) : (
              <span className="h-24 w-28 rounded-full bg-surface-2 opacity-30" />
            )}
            <div className="mt-2 text-sm font-semibold text-muted">
              Sem rank ainda
            </div>
            <p className="mt-1 text-center text-[11px] leading-snug text-muted">
              O elo aparece após as partidas de calibração em modo ranqueado.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
