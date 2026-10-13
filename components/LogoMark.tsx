/**
 * Símbolo do SEARCHLOCK para uso ao lado do nome.
 *
 * Variante sem o fundo arredondado do favicon: aqui o símbolo fica sobre a
 * superfície do header, e um fundo próprio viraria um selo colado no texto.
 * Usa `currentColor` para acompanhar a cor do logo.
 */
export default function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="6 6 49 49"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="logomark-lens">
          <circle cx="24" cy="24" r="14" />
        </clipPath>
      </defs>
      <g clip-path="url(#logomark-lens)" fill="currentColor">
        <rect x="10" y="25" width="8" height="15" />
        <rect x="20" y="15" width="9" height="25" />
        <rect x="31" y="22" width="8" height="18" />
      </g>
      <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="5" />
      <path
        d="M34.5 34.5 L49 49"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}
