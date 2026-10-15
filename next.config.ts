import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy: de onde a página pode carregar cada tipo de
 * recurso. Se algum dia um dado da API escapar para o HTML, o navegador ainda
 * se recusa a executar script ou carregar algo de origem desconhecida.
 *
 * - script: o próprio site. `unsafe-inline` é exigido pelos scripts de
 *   hidratação que o Next injeta inline (a alternativa, nonce por requisição,
 *   desligaria a renderização estática de todas as páginas). Em dev, o Fast
 *   Refresh precisa também de `unsafe-eval`. O script do Vercel Analytics é
 *   servido pelo próprio domínio em produção e por va.vercel-scripts.com em dev.
 * - img: só os domínios de onde as imagens realmente vêm — assets do jogo e
 *   avatares da Steam. Levantado contra páginas reais e o catálogo de itens.
 * - frame-ancestors 'none': ninguém pode embutir o site num iframe
 *   (clickjacking).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://assets-bucket.deadlock-api.com https://api.deadlock-api.com https://*.steamstatic.com",
  "font-src 'self'",
  `connect-src 'self' https://va.vercel-scripts.com${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Navegadores antigos que não entendem frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
  // Impede o navegador de "adivinhar" o tipo de um arquivo e executá-lo.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Links externos recebem só o domínio, nunca o caminho com o account_id.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // O site não usa nenhum desses recursos; negar fecha a porta para abuso.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // Só HTTPS por 2 anos, inclusive subdomínios.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Não anuncia "X-Powered-By: Next.js" — informação de graça para quem procura alvo.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.steamstatic.com" },
      { protocol: "https", hostname: "assets-bucket.deadlock-api.com" },
      { protocol: "https", hostname: "api.deadlock-api.com" },
    ],
    // A otimização de imagem é cobrada por imagem gerada na Vercel. Limitar
    // larguras e formatos reduz as variações que um visitante (ou um script
    // pedindo tamanhos aleatórios) consegue fazer o servidor gerar.
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [64, 128, 256, 384],
    formats: ["image/webp"],
    // Arte do jogo muda só em patch: um mês de cache na CDN.
    minimumCacheTTL: 2_592_000,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
