import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    assetsDir: "assets",
    cssCodeSplit: true,
    emptyOutDir: true,
    sourcemap: false,
    target: "es2020",
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
