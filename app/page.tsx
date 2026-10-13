import Image from "next/image";
import SearchBar from "@/components/SearchBar";
import { CITY_BACKGROUND } from "@/lib/api";

export default function HomePage() {
  return (
    <>
      {/* Cidade do menu do Deadlock ao fundo. A arte original já é escura e
          dessaturada; o véu em gradiente apenas garante contraste do texto e
          dissolve a imagem na cor de fundo nas bordas. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <Image
          src={CITY_BACKGROUND}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-bottom opacity-70"
        />
        {/* Véu mais denso no topo, onde ficam título e busca, e quase ausente
            embaixo — a cidade emerge na metade inferior sem disputar com o texto. */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg/5 via-bg/65 to-bg" />
      </div>

      <main className="mx-auto flex max-w-[640px] flex-col items-center px-4 pt-24 pb-16 text-center sm:pt-32">
        <h1 className="text-4xl font-extrabold tracking-tight drop-shadow-lg sm:text-5xl">
          DEADLOCK<span className="text-accent">.TRACKER</span>
        </h1>
        <p className="mt-3 text-sm text-eggshell drop-shadow">
          Veja rank, histórico de partidas e desempenho por herói de qualquer jogador.
        </p>

        <div className="mt-8 w-full">
          <SearchBar autoFocus />
        </div>

        <p className="mt-4 text-xs text-muted drop-shadow">
          Aceita nome, account ID ou o link do perfil Steam. Contas inativas nos últimos
          30 dias podem não aparecer na busca por nome.
        </p>
      </main>
    </>
  );
}
