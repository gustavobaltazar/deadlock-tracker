"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-[560px] px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Algo deu errado</h1>
      <p className="mt-2 text-sm text-muted">
        A Deadlock API pode estar instável ou com limite de requisições atingido.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-md border border-border bg-surface-2 px-4 py-2 text-sm font-semibold hover:border-accent"
      >
        Tentar novamente
      </button>
    </main>
  );
}
