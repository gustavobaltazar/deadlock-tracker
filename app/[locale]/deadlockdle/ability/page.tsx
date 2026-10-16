import type { Metadata } from "next";
import AbilityGame from "@/components/dle/AbilityGame";
import { abilityOfDay } from "@/lib/dle-ability";
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
    title: `${t.dle.nav} · ${t.dle.modes.ability.title}`,
    description: t.dle.modes.ability.desc,
  };
}

export default async function AbilityPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string | string[] }>;
}) {
  const { day, archive } = await gameDay(searchParams);
  const game = await abilityOfDay(day);

  return (
    <AbilityGame
      key={day}
      day={day}
      heroes={heroOptions(game.pool)}
      portraits={heroPortraits(game.pool)}
      archive={archive}
    />
  );
}
