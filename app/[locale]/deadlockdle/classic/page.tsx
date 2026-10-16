import type { Metadata } from "next";
import ClassicGame from "@/components/dle/ClassicGame";
import { dleDay, getDlePool, heroOfDay } from "@/lib/dle";
import { heroOptions, heroPortraits, option, previousDay } from "@/lib/dle-page";
import { getDictionary, isLocale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "en");
  return {
    title: `${t.dle.nav} · ${t.dle.modes.classic.title}`,
    description: t.dle.modes.classic.desc,
  };
}

export default async function ClassicPage() {
  const day = dleDay();
  const pool = await getDlePool();

  return (
    <ClassicGame
      day={day}
      heroes={heroOptions(pool)}
      portraits={heroPortraits(pool)}
      yesterday={option(heroOfDay(pool, previousDay(day)))}
    />
  );
}
