import type { Metadata } from "next";
import AbilityGame from "@/components/dle/AbilityGame";
import { dleDay } from "@/lib/dle";
import { abilityOfDay } from "@/lib/dle-ability";
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
    title: `${t.dle.nav} · ${t.dle.modes.ability.title}`,
    description: t.dle.modes.ability.desc,
  };
}

export default async function AbilityPage() {
  const day = dleDay();
  const [today, yesterday] = await Promise.all([
    abilityOfDay(day),
    abilityOfDay(previousDay(day)),
  ]);

  return (
    <AbilityGame
      day={day}
      heroes={heroOptions(today.pool)}
      portraits={heroPortraits(today.pool)}
      yesterday={option(yesterday.hero)}
    />
  );
}
