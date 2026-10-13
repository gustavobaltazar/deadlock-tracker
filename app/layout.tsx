import "./globals.css";

/**
 * O Next exige um layout na raiz, mas as tags <html>/<body> ficam em
 * `app/[locale]/layout.tsx`, onde o idioma é conhecido e pode ir no atributo
 * `lang`. Este layout apenas repassa o conteúdo.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
