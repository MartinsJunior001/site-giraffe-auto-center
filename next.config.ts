import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  images: {
    // AVIF primeiro (cerca de 45% menor que o WebP nas imagens do hero, com a mesma qualidade visual);
    // WebP para navegadores sem AVIF. Cada formato fica em cache separado no servidor.
    formats: ["image/avif", "image/webp"],
    // Larguras padrão do Next mais 2560: celulares de densidade ~1,75 pediam a imagem do hero inteira
    // (2688 px) por faltar um degrau entre 2048 e 3840.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3840],
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
