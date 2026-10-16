import type { Metadata } from "next";
import DleHub from "@/components/dle/DleHub";
import { dleDay, previousDay } from "@/lib/dle";
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

/** Menu do Deadlockdle, com o andamento de cada modo hoje e ontem. */
export default async function DeadlockdleHubPage() {
  const day = dleDay();
  return <DleHub day={day} yesterday={previousDay(day)} />;
}
