import type { MetadataRoute } from "next";

/**
 * As páginas de jogador são geradas sob demanda a partir da API; não faz
 * sentido deixar buscadores rastrearem milhões delas. A home fica liberada.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
  };
}
