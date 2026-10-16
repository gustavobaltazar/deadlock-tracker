import type { Metadata } from "next";
import DleHub from "@/components/dle/DleHub";
import { dleDay, getDlePool, heroOfDay } from "@/lib/dle";
import { option, previousDay } from "@/lib/dle-page";
import { abilityOfDay } from "@/lib/dle-ability";
import { voiceOfDay } from "@/lib/dle-voice";
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

/** Menu do Deadlockdle, com o andamento de cada modo e os heróis de ontem. */
export default async function DeadlockdleHubPage() {
  const yesterday = previousDay(dleDay());
  const [pool, voice, ability] = await Promise.all([
    getDlePool(),
    voiceOfDay(yesterday),
    abilityOfDay(yesterday),
  ]);

  return (
    <DleHub
      day={dleDay()}
      yesterday={{
        classic: option(heroOfDay(pool, yesterday)),
        voice: option(voice.hero),
        ability: option(ability.hero),
      }}
    />
  );
}
