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
    // MapLibre is large and only needed on map views; splitting it keeps the
    // initial bundle small on slow connections.
    rollupOptions: {
      output: {
        manualChunks: {
          maplibre: ["maplibre-gl"],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
