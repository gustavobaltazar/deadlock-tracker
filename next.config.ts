import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.steamstatic.com" },
      { protocol: "https", hostname: "assets-bucket.deadlock-api.com" },
      { protocol: "https", hostname: "api.deadlock-api.com" },
    ],
  },
};

export default nextConfig;
