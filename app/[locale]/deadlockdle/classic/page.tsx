import type { Metadata } from "next";
import ClassicGame from "@/components/dle/ClassicGame";
import { getDlePool } from "@/lib/dle";
import { gameDay, heroOptions, heroPortraits } from "@/lib/dle-page";
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

export default async function ClassicPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string | string[] }>;
}) {
  const { day, archive } = await gameDay(searchParams);
  const pool = await getDlePool();

  return (
    <ClassicGame
      key={day}
      day={day}
      heroes={heroOptions(pool)}
      portraits={heroPortraits(pool)}
      archive={archive}
    />
  );
}
