/** Ícone de cada modo do Deadlockdle, desenhado para herdar a cor do texto. */
export default function ModeIcon({
  mode,
  className,
}: {
  mode: "classic" | "voice" | "ability";
  className?: string;
}) {
  if (mode === "classic") {
    // Grade de quadradinhos: o tabuleiro do modo clássico.
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <rect x="3" y="3" width="5" height="5" rx="1" />
        <rect x="9.5" y="3" width="5" height="5" rx="1" opacity="0.55" />
        <rect x="16" y="3" width="5" height="5" rx="1" opacity="0.3" />
        <rect x="3" y="9.5" width="5" height="5" rx="1" opacity="0.55" />
        <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
        <rect x="16" y="9.5" width="5" height="5" rx="1" opacity="0.55" />
        <rect x="3" y="16" width="5" height="5" rx="1" opacity="0.3" />
        <rect x="9.5" y="16" width="5" height="5" rx="1" opacity="0.55" />
        <rect x="16" y="16" width="5" height="5" rx="1" />
      </svg>
    );
  }
  if (mode === "voice") {
    // Ondas sonoras.
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <rect x="2" y="10" width="2.4" height="4" rx="1.2" />
        <rect x="6" y="6.5" width="2.4" height="11" rx="1.2" />
        <rect x="10" y="3" width="2.4" height="18" rx="1.2" />
        <rect x="14" y="7.5" width="2.4" height="9" rx="1.2" />
        <rect x="18" y="5" width="2.4" height="14" rx="1.2" />
      </svg>
    );
  }
  // Habilidade: losango com brilho, ainda sem modo.
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2 21 12 12 22 3 12z" opacity="0.35" />
      <path d="M12 7l5 5-5 5-5-5z" />
    </svg>
  );
}
