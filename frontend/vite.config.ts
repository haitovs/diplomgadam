import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const API_TARGET = process.env.VITE_DEV_API ?? "http://localhost:4080";

// In production the server serves the built SPA from the same origin, so these
// proxies exist only so `npm run dev` behaves the same way.
const proxied = ["/api", "/uploads", "/maps"];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      proxied.map((path) => [
        path,
        { target: API_TARGET, changeOrigin: true },
      ]),
    ),
  },
  build: {
    // MapLibre is split out by the lazy /map route rather than by a manual
    // chunk. Naming it manually put it in the entry graph, which had Vite
    // preload all 800 kB of it from index.html for visitors who never opened
    // the map — the opposite of what the split was for.
    chunkSizeWarningLimit: 900,
  },
});
