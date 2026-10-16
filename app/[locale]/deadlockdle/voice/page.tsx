import type { Metadata } from "next";
import VoiceGame from "@/components/dle/VoiceGame";
import { dleDay } from "@/lib/dle";
import { heroOptions, heroPortraits, option, previousDay } from "@/lib/dle-page";
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
    title: `${t.dle.nav} · ${t.dle.modes.voice.title}`,
    description: t.dle.modes.voice.desc,
  };
}

export default async function VoicePage() {
  const day = dleDay();
  const [today, yesterday] = await Promise.all([
    voiceOfDay(day),
    voiceOfDay(previousDay(day)),
  ]);

  return (
    <VoiceGame
      day={day}
      heroes={heroOptions(today.pool)}
      portraits={heroPortraits(today.pool)}
      yesterday={option(yesterday.hero)}
    />
  );
}
