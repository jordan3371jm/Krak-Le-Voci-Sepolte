import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Build in un unico index.html con JS e CSS incorporati:
// funziona con doppio clic (file://), su Playgama, itch.io e GitHub Pages.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  server: { host: "0.0.0.0", port: 3000 },
});
