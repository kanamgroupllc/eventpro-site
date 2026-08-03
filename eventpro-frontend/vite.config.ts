import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const isDockerDev = process.env.DOCKER === "1" || process.env.CHOKIDAR_USEPOLLING === "true";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: process.env.VITE_ASSET_BASE_URL || "/",
  // Default cache is node_modules/.vite — in Docker, node_modules is a named volume and a stale
  // dep cache causes "504 Outdated Optimize Dep" in the browser. Keep the cache on the bind-mounted tree.
  cacheDir: path.resolve(__dirname, ".vite-cache"),
  server: {
    host: "0.0.0.0", // listen on all interfaces so Docker port mapping works
    port: 5173,
    fs: {
      // Monorepo: allow Vite to read @eventpro/shared source outside eventpro-frontend/
      allow: [".."],
    },
    watch: {
      // Bind mounts often miss file events without polling (Docker Desktop, some Linux setups).
      usePolling: isDockerDev,
    },
    hmr: {
      overlay: false,
    },
    // In dev, proxy /api to backend so the app works without CORS and with backend in Docker (backend:8080) or on host (localhost:8080)
    proxy:
      mode === "development"
        ? {
            "/api": {
              target: process.env.VITE_PROXY_TARGET || "http://localhost:8080",
              changeOrigin: true,
            },
          }
        : undefined,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Compile shared package from TS source (dist is CJS; Vite needs ESM named exports)
      "@eventpro/shared": path.resolve(__dirname, "../packages/eventpro-shared/src/index.ts"),
    },
    // Force a single copy of React so hooks work (avoids "Invalid hook call" with react-query, etc.)
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
