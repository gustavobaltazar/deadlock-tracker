"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { fill } from "@/lib/i18n";
import { useI18n } from "./I18nProvider";

/** Partida reduzida ao mínimo que o mapa precisa: [start_time, venceu]. */
export type ActivityGame = [number, boolean];


/** Partidas no dia a partir das quais cada tom é usado. */
const NIVEIS = [1, 3, 5, 8];
const TONS = [
  "bg-surface-2",
  "bg-accent-dark/50",
  "bg-accent-dark",
  "bg-accent-dim",
  "bg-accent",
];

type Dia = { data: Date; vitorias: number; derrotas: number; futuro: boolean };

const semAssinatura = () => () => {};

/** Chave do dia no fuso local, sem depender de formatação de string. */
function chave(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function nivel(partidas: number): number {
  let n = 0;
  for (const limite of NIVEIS) if (partidas >= limite) n++;
  return n;
}

/**
 * Mapa de atividade no estilo do "contribution graph" do GitHub: cada coluna
 * é uma semana (domingo a sábado) e cada quadrado um dia, mais claro quanto
 * mais partidas o jogador jogou.
 *
 * Os dias são montados no fuso de quem visita — uma partida às 23h em São
 * Paulo já é o dia seguinte em UTC, e agrupar no servidor jogaria a noite do
 * jogador no quadrado errado. Por isso a grade só é preenchida no cliente; no
 * HTML do servidor vai o esqueleto com as mesmas dimensões.
 */
export default function ActivityHeatmap({
  games,
  weeks,
}: {
  games: ActivityGame[];
  /** Semanas exibidas; a última é a semana atual. */
  weeks: number;
}) {
  const { locale, t } = useI18n();
  const tag = locale === "pt" ? "pt-BR" : "en-US";
  const noCliente = useSyncExternalStore(
    semAssinatura,
    () => true,
    () => false,
  );
  const [foco, setFoco] = useState<{ dia: Dia; x: number; y: number } | null>(
    null,
  );

  const semanas = useMemo(() => {
    if (!noCliente) return null;

    const porDia = new Map<string, { v: number; d: number }>();
    for (const [inicio, venceu] of games) {
      const k = chave(new Date(inicio * 1000));
      const atual = porDia.get(k) ?? { v: 0, d: 0 };
      if (venceu) atual.v++;
      else atual.d++;
      porDia.set(k, atual);
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    // A última coluna é a semana atual; a grade começa no domingo de
    // weeks - 1 semanas antes.
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - hoje.getDay() - (weeks - 1) * 7);

    return Array.from({ length: weeks }, (_, s) =>
      Array.from({ length: 7 }, (_, d): Dia => {
        const data = new Date(inicio);
        data.setDate(inicio.getDate() + s * 7 + d);
        const total = porDia.get(chave(data));
        return {
          data,
          vitorias: total?.v ?? 0,
          derrotas: total?.d ?? 0,
          futuro: data > hoje,
        };
      }),
    );
  }, [games, weeks, noCliente]);

  const formatoMes = new Intl.DateTimeFormat(tag, { month: "short" });
  const formatoDia = new Intl.DateTimeFormat(tag, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const formatoSemana = new Intl.DateTimeFormat(tag, { weekday: "short" });
  // 2023-01-01 foi domingo: base para os nomes dos dias no idioma da página.
  const nomesDias = Array.from({ length: 7 }, (_, i) =>
    formatoSemana.format(new Date(2023, 0, 1 + i)).replace(".", ""),
  );

  /*
   * Mês escrito na primeira semana que o contém. Um rótulo ocupa ~3 colunas,
   * então ele é omitido quando o seguinte começa antes disso — acontece na
   * primeira coluna, que quase sempre pega só o fim de um mês — e na última,
   * onde vazaria para fora do card.
   */
  const meses: Record<number, string> = {};
  if (semanas) {
    const inicios = semanas
      .map((semana, s) => ({ s, data: semana[0].data }))
      .filter(
        ({ s, data }) =>
          s === 0 || data.getMonth() !== semanas[s - 1][0].data.getMonth(),
      );
    inicios.forEach(({ s, data }, i) => {
      const proximo = inicios[i + 1]?.s ?? weeks + 2;
      if (proximo - s < 3 || s > weeks - 2) return;
      meses[s] = formatoMes.format(data).replace(".", "");
    });
  }

  const diasJogados =
    semanas?.flat().filter((d) => d.vitorias + d.derrotas > 0).length ?? 0;

  return (
    <div className="relative px-3 py-3" onMouseLeave={() => setFoco(null)}>
      <div className="flex gap-1.5">
        {/* Rótulos dos dias: só seg/qua/sex, como no GitHub, para não poluir */}
        <div className="grid shrink-0 grid-rows-[auto_repeat(7,1fr)] gap-[3px] text-[10px] leading-none text-muted">
          <span className="h-3" />
          {nomesDias.map((nome, i) => (
            <span key={i} className="flex items-center">
              {i % 2 === 1 ? nome : ""}
            </span>
          ))}
        </div>

        <div
          className="grid min-w-0 flex-1 grid-flow-col gap-[3px]"
          style={{
            gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`,
            gridTemplateRows: "auto repeat(7, auto)",
          }}
        >
          {Array.from({ length: weeks }, (_, s) => {
            const semana = semanas?.[s];
            return [
              <span
                key={`m${s}`}
                className="h-3 overflow-visible whitespace-nowrap text-[10px] leading-none text-muted"
              >
                {meses[s] ?? ""}
              </span>,
              ...Array.from({ length: 7 }, (_, d) => {
                const dia = semana?.[d];
                if (!dia || dia.futuro) {
                  return (
                    <span
                      key={`${s}-${d}`}
                      className={`aspect-square rounded-[2px] ${
                        dia ? "" : "bg-surface-2/60"
                      }`}
                    />
                  );
                }
                const partidas = dia.vitorias + dia.derrotas;
                return (
                  <span
                    key={`${s}-${d}`}
                    className={`aspect-square rounded-[2px] ${TONS[nivel(partidas)]} ${
                      foco?.dia === dia ? "outline outline-1 outline-ink" : ""
                    }`}
                    onMouseEnter={(e) => {
                      const caixa = e.currentTarget;
                      const pai = caixa.offsetParent as HTMLElement | null;
                      const ref = pai?.getBoundingClientRect();
                      const r = caixa.getBoundingClientRect();
                      const centro = r.left + r.width / 2 - (ref?.left ?? 0);
                      // Prende o balão dentro do card nas colunas das pontas.
                      const margem = 52;
                      setFoco({
                        dia,
                        x: ref
                          ? Math.min(Math.max(centro, margem), ref.width - margem)
                          : centro,
                        y: r.top - (ref?.top ?? 0),
                      });
                    }}
                  />
                );
              }),
            ];
          })}
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-muted">
        <span>
          {semanas
            ? fill(t.player.activityDays, { n: diasJogados })
            : " "}
        </span>
        <span className="flex items-center gap-[3px]">
          {t.player.activityLess}
          {TONS.map((tom) => (
            <span key={tom} className={`size-2.5 rounded-[2px] ${tom}`} />
          ))}
          {t.player.activityMore}
        </span>
      </div>

      {foco && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded border border-border bg-bg px-2 py-1 text-[11px] shadow-lg"
          style={{ left: foco.x, top: foco.y - 6 }}
        >
          <div className="text-muted">{formatoDia.format(foco.dia.data)}</div>
          <div className="font-semibold tabular-nums">
            <span className="text-win">
              {foco.dia.vitorias}
              {t.player.winLetter}
            </span>
            {" - "}
            <span className="text-loss">
              {foco.dia.derrotas}
              {t.player.lossLetter}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
