/**
 * A Deadlock API só conhece uma partida depois que ela entra no banco de coleta.
 * Para contas que não são "bot friend" (Patreon) nem usam a ferramenta de ingest,
 * isso costuma atrasar de algumas horas a vários dias — o que parece dado faltando.
 * Este aviso deixa a defasagem explícita em vez de silenciosa.
 */
export default function DataFreshness({
  lastMatchTime,
}: {
  lastMatchTime: number | null;
}) {
  if (lastMatchTime == null) return null;

  const hours = (Date.now() / 1000 - lastMatchTime) / 3600;
  const stale = hours >= 24;
  const label =
    hours < 1
      ? "menos de 1 hora"
      : hours < 24
        ? `${Math.round(hours)} horas`
        : `${Math.round(hours / 24)} dias`;

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-xs ${
        stale
          ? "border-accent/40 bg-accent/10 text-ink"
          : "border-border bg-surface text-muted"
      }`}
    >
      <span className="font-semibold">
        Partida mais recente registrada: {label} atrás.
      </span>{" "}
      {stale && (
        <>
          Partidas jogadas depois disso podem ainda não ter sido coletadas. A API
          indexa partidas de contas comuns com atraso; para histórico em tempo real, a
          conta precisa enviar os dados pela{" "}
          <a
            href="https://deadlock-api.com/ingest-cache"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline"
          >
            ferramenta de ingest
          </a>{" "}
          da Deadlock API.
        </>
      )}
    </div>
  );
}
