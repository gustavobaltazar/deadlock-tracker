"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "../I18nProvider";
import ModeIcon from "./ModeIcon";
import { readProgress, DLE_MODES as MODES, type DleMode, type GuessBase } from "./shared";

/**
 * Abas dos modos, no topo de toda página do Deadlockdle. Um modo já resolvido
 * hoje ganha um selo verde — como os ícones do topo do Loldle.
 */
export default function DleNav({ day }: { day: string }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const [solved, setSolved] = useState<Set<DleMode>>(new Set());

  // Relido a cada troca de página: voltar de um modo resolvido atualiza o selo.
  useEffect(() => {
    setSolved(
      new Set(
        MODES.filter((m) => readProgress<GuessBase>(m, day).some((r) => r.correct)),
      ),
    );
  }, [day, pathname]);

  return (
    <nav className="mt-5 flex justify-center gap-3" aria-label="Deadlockdle">
      {MODES.map((mode) => {
        const href = `/${locale}/deadlockdle/${mode}`;
        const active = pathname === href;
        return (
          <Link
            key={mode}
            href={href}
            title={t.dle.modes[mode].title}
            aria-current={active ? "page" : undefined}
            className={
              "relative grid size-12 place-items-center rounded-full border-2 transition-all hover:scale-110 " +
              (active
                ? "border-accent bg-accent/15 text-accent shadow-[0_0_16px_rgba(242,224,191,0.25)]"
                : "border-border bg-surface text-muted hover:border-accent-dim hover:text-ink")
            }
          >
            <ModeIcon mode={mode} className="size-6" />
            {solved.has(mode) && (
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-win text-[10px] font-black text-bg">
                ✓
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
