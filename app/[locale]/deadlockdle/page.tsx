import type { Metadata } from "next";
import { connection } from "next/server";
import DleGame, { type DleOption } from "@/components/DleGame";
import { dleDay, getDlePool, heroOfDay } from "@/lib/dle";
import { getDictionary, isLocale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "en");
  return {
    title: t.dle.nav,
    description: t.dle.tagline,
    alternates: {
      canonical: `/${locale}/deadlockdle`,
      languages: { en: "/en/deadlockdle", "pt-BR": "/pt/deadlockdle" },
    },
  };
}

export default async function DeadlockdlePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // O dia do jogo sai do relógio: a página não pode ser gerada no build.
  await connection();
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "en");

  const day = dleDay();
  const pool = await getDlePool();
  const yesterdayHero = heroOfDay(
    pool,
    dleDay(new Date(Date.parse(day + "T00:00:00Z") - 86_400_000)),
  );

  // Para o navegador vai só o necessário para listar e desenhar os heróis —
  // nunca os atributos, que permitiriam deduzir o herói do dia sem jogar.
  const heroes: DleOption[] = pool
    .map((h) => ({ id: h.id, name: h.name, icon: h.icon }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const portraits = Object.fromEntries(
    pool.map((h) => [h.id, { portrait: h.portrait, color: h.styleHex }]),
  );

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          <span className="text-muted">DEADLOCK</span>
          <span className="text-accent">DLE</span>
        </h1>
        <p className="mt-2 text-sm text-eggshell">{t.dle.tagline}</p>
      </header>

      <DleGame
        day={day}
        heroes={heroes}
        portraits={portraits}
        yesterday={{
          id: yesterdayHero.id,
          name: yesterdayHero.name,
          icon: yesterdayHero.icon,
        }}
      />
    </main>
  );
}
