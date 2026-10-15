"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "./I18nProvider";
import { apiErrorMessage, fill } from "@/lib/i18n";

type Result = {
  account_id: number;
  personaname: string | null;
  avatar: string | null;
  matches_played_last_30d: number | null;
};

export default function SearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  // account_id já resolvido pelo servidor quando a busca é um ID, um SteamID64
  // ou uma URL de perfil Steam.
  const [exact, setExact] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Busca com debounce; cada digitada cancela a requisição anterior.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setExact(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          results?: Result[];
          exact?: number;
          error?: string;
        };
        setResults(data.results ?? []);
        setExact(data.exact ?? null);
        setError(
          data.error ? apiErrorMessage(data.error, t, t.errors.upstream) : null,
        );
        setHighlight(0);
        setOpen(true);
      } catch {
        // Abort é esperado a cada nova digitada.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, t]);

  // Mantém a opção destacada visível ao navegar com as setas.
  useEffect(() => {
    listRef.current?.children[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function go(accountId: number) {
    setOpen(false);
    router.push(`/${locale}/player/${accountId}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // O servidor já resolveu ID, SteamID64 ou URL de perfil: vai direto.
    if (event.key === "Enter") {
      if (exact != null) return go(exact);
      if (results[highlight]) return go(results[highlight].account_id);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    }
    if (event.key === "Escape") setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-4 py-3 focus-within:border-accent">
        <svg
          viewBox="0 0 24 24"
          className="size-5 shrink-0 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={t.search.placeholder}
          className="w-full bg-transparent text-base outline-none placeholder:text-muted"
          aria-label={t.search.label}
        />
        {loading && (
          <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-accent" />
        )}
      </div>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-20 mt-1 max-h-[22rem] w-full overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface shadow-xl"
        >
          {results.length === 0 && !loading && (
            <li className="px-4 py-3 text-sm text-muted">
              {error ?? t.search.empty}
            </li>
          )}
          {results.map((r, i) => (
            <li key={r.account_id}>
              <button
                onClick={() => go(r.account_id)}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                  i === highlight ? "bg-surface-2" : ""
                }`}
              >
                {r.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatar} alt="" className="size-8 rounded" />
                ) : (
                  <span className="size-8 rounded bg-surface-2" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {r.personaname ?? fill(t.player.unknown, { id: r.account_id })}
                  </span>
                  <span className="block text-xs text-muted">#{r.account_id}</span>
                </span>
                {r.matches_played_last_30d != null && (
                  <span className="shrink-0 text-xs text-muted">
                    {fill(t.search.gamesIn30d, { n: r.matches_played_last_30d })}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
