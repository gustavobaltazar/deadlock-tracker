import type { Metadata } from "next";
import EmojiGame from "@/components/dle/EmojiGame";
import { emojiOfDay } from "@/lib/dle-emoji";
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
    title: `${t.dle.nav} · ${t.dle.modes.emoji.title}`,
    description: t.dle.modes.emoji.desc,
  };
}

export default async function EmojiPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string | string[] }>;
}) {
  const { day, archive } = await gameDay(searchParams);
  const game = await emojiOfDay(day);

  return (
    <EmojiGame
      key={day}
      day={day}
      heroes={heroOptions(game.pool)}
      portraits={heroPortraits(game.pool)}
      archive={archive}
    />
  );
}
