import Link from "next/link";
import SearchBar from "@/components/SearchBar";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[560px] px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Jogador não encontrado</h1>
      <p className="mt-2 text-sm text-muted">
        Não há dados registrados para essa conta. Tente buscar pelo nome do perfil Steam.
      </p>
      <div className="mt-6">
        <SearchBar />
      </div>
      <Link href="/" className="mt-6 inline-block text-xs text-accent hover:underline">
        Voltar ao início
      </Link>
    </main>
  );
}
