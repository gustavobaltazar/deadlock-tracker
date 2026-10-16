import type { Metadata } from "next";
import { connection } from "next/server";
import TowerGame from "@/components/tower/TowerGame";
import { getDictionary, isLocale } from "@/lib/i18n";
import { getTowerCatalog } from "@/lib/tower/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "en");
  return { title: t.tower.nav, description: t.tower.tagline };
}

/** A Torre: o roguelike. O catálogo vem do servidor; o jogo roda no navegador. */
export default async function TowerPage() {
  // Catálogo em memória, montado a partir da API: nada disso pode ir para o build.
  await connection();
  const catalog = await getTowerCatalog();
  return <TowerGame catalog={catalog} />;
}
