import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const uiSource = fileURLToPath(new URL("./ui/src", import.meta.url));

// The UI is a static app served by `cairn ui`. In development, Vite serves it and forwards /api to a running `cairn ui`.
export default defineConfig({
  root: "ui",
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": uiSource }
  },
  build: {
    outDir: "../dist/ui",
    emptyOutDir: true,
    // The app is read from local disk, so one bundle is simpler than splitting it for download size.
    chunkSizeWarningLimit: 1024
  },
  server: {
    proxy: { "/api": "http://127.0.0.1:4317" }
  }
});
