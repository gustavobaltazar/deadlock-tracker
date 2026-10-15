"use client";

import { useState } from "react";
import { useI18n } from "./I18nProvider";
import MatchDetails from "./MatchDetails";
import MatchRow from "./MatchRow";
import type { MatchView } from "@/lib/api";
import { apiErrorMessage, fill } from "@/lib/i18n";

const PAGE_SIZE = 20;

export default function MatchList({
  accountId,
  initialMatches,
  total,
}: {
  accountId: number;
  initialMatches: MatchView[];
  total: number;
}) {
  const { t } = useI18n();
  const [matches, setMatches] = useState(initialMatches);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Só uma partida aberta por vez: cada abertura dispara requisições à API.
  const [expanded, setExpanded] = useState<number | null>(null);

  const hasMore = matches.length < total;

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/matches?account_id=${accountId}&offset=${matches.length}&limit=${PAGE_SIZE}`,
      );
      const data = (await res.json()) as { matches?: MatchView[]; error?: string };
      if (data.error) {
        setError(apiErrorMessage(data.error, t, t.match.loadError));
        return;
      }
      setMatches((prev) => [...prev, ...(data.matches ?? [])]);
    } catch {
      setError(t.match.loadError);
    } finally {
      setLoading(false);
    }
  }

  if (matches.length === 0) {
    return (
      <p className="px-3 py-6 text-sm text-muted">
        {t.match.empty}
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-1.5 p-2">
        {matches.map((m) => {
          const isOpen = expanded === m.match_id;
          return (
            <li
              key={m.match_id}
              className="rounded-md border border-transparent data-[open=true]:border-border"
              data-open={isOpen}
            >
              <MatchRow
                match={m}
                expanded={isOpen}
                onToggle={() => setExpanded(isOpen ? null : m.match_id)}
              />
              {isOpen && (
                <MatchDetails matchId={m.match_id} accountId={accountId} />
              )}
            </li>
          );
        })}
      </ul>

      <div className="border-t border-border px-3 py-3 text-center">
        <p className="mb-2 text-xs text-muted">
          {fill(t.match.showing, { n: matches.length, total })}
        </p>
        {error && <p className="mb-2 text-xs text-loss">{error}</p>}
        {hasMore ? (
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-md border border-border bg-surface-2 px-5 py-2 text-sm font-semibold hover:border-accent disabled:opacity-50"
          >
            {loading ? t.match.loading : t.match.loadMore}
          </button>
        ) : (
          <p className="text-xs text-muted">{t.match.endOfHistory}</p>
        )}
      </div>
    </>
  );
}
