import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Force browser-compatible polyfill instead of Node builtin.
      buffer: "buffer/",
    },
  },
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  server: {
    allowedHosts: ["gater-dev.agentix.bot", "gater-app.agentix.bot"],
  },
  ssr: {
    noExternal: ["ethereum-identity-kit"],
  },
})
