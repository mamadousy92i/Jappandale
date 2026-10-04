import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Tailwind v4 écrit ses couleurs en oklch()/color-mix(), que Chrome ne comprend qu'à
// partir de la version 111 : sur un navigateur plus ancien, un bouton vert à texte
// blanc devient invisible. On demande à Lightning CSS de produire des équivalents
// rgb() compatibles avec les navigateurs encore répandus au Sénégal.
const oldestSupportedBrowsers = {
  chrome: 80 << 16,
  edge: 88 << 16,
  firefox: 78 << 16,
  safari: 13 << 16,
  android: 80 << 16,
}

export default defineConfig({
  css: {
    transformer: "lightningcss",
    lightningcss: { targets: oldestSupportedBrowsers },
  },
  build: {
    cssMinify: "lightningcss",
    // Même logique côté JavaScript : le défaut de Vite vise des navigateurs de 2022 et plus récents.
    target: ["chrome87", "edge88", "firefox78", "safari14"],
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8001",
      "/media": "http://localhost:8001",
    },
  },
})
