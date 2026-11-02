import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base relativa: la build funziona da qualunque cartella (Playgama, itch.io, GitHub Pages)
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  server: { host: "0.0.0.0", port: 3000 },
});
