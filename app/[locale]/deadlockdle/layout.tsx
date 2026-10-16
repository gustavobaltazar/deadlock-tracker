import Link from "next/link";
import { connection } from "next/server";
import DleNav from "@/components/dle/DleNav";
import { dleDay } from "@/lib/dle";
import { getDictionary, isLocale } from "@/lib/i18n";

/** Moldura comum do Deadlockdle: título, subtítulo e as abas dos modos. */
export default async function DeadlockdleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // O dia do jogo sai do relógio: nada aqui pode ser gerado no build.
  await connection();
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "en");

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8">
      <header className="mb-7 text-center">
        <Link href={`/${locale}/deadlockdle`} className="inline-block">
          <h1 className="text-4xl font-extrabold tracking-tight drop-shadow-[0_0_18px_rgba(242,224,191,0.15)] sm:text-5xl">
            <span className="text-muted">DEADLOCK</span>
            <span className="text-accent">DLE</span>
          </h1>
        </Link>
        <p className="mt-2 text-sm text-eggshell">{t.dle.tagline}</p>
        <DleNav day={dleDay()} />
      </header>
      {children}
    </main>
  );
}
