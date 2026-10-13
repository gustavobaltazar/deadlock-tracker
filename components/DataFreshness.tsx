/**
 * A Deadlock API só conhece uma partida depois que ela entra no banco de coleta.
 * Para contas que não são "bot friend" (Patreon) nem usam a ferramenta de ingest,
 * isso costuma atrasar de algumas horas a vários dias — o que parece dado faltando.
 * Este aviso deixa a defasagem explícita em vez de silenciosa.
 */
import { fill, type Dictionary } from "@/lib/i18n";

export default function DataFreshness({
  lastMatchTime,
  t,
}: {
  lastMatchTime: number | null;
  t: Dictionary;
}) {
  if (lastMatchTime == null) return null;

  const hours = (Date.now() / 1000 - lastMatchTime) / 3600;
  const stale = hours >= 24;
  const label =
    hours < 1
      ? t.freshness.lessThanHour
      : hours < 24
        ? fill(t.freshness.hours, { n: Math.round(hours) })
        : fill(t.freshness.days, { n: Math.round(hours / 24) });

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-xs ${
        stale
          ? "border-accent/40 bg-accent/10 text-ink"
          : "border-border bg-surface text-muted"
      }`}
    >
      <span className="font-semibold">
        {fill(t.freshness.lastMatch, { ago: label })}
      </span>{" "}
      {stale && (
        <>
          {t.freshness.staleWarning}{" "}
          <a
            href="https://deadlock-api.com/ingest-cache"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline"
          >
            {t.freshness.ingestTool}
          </a>
          .
        </>
      )}
    </div>
  );
}
