import type { Metadata } from "next";
import VoiceGame from "@/components/dle/VoiceGame";
import { gameDay, heroOptions, heroPortraits } from "@/lib/dle-page";
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

export default async function VoicePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string | string[] }>;
}) {
  const { day, archive } = await gameDay(searchParams);
  const game = await voiceOfDay(day);

  return (
    <VoiceGame
      key={day}
      day={day}
      heroes={heroOptions(game.pool)}
      portraits={heroPortraits(game.pool)}
      archive={archive}
    />
  );
}
