import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue"; // или ваш фреймворк, если это не Vue

export default defineConfig({
  // Сайт живёт на GitHub Pages по адресу /BookJournal/ — все пути ассетов от этой базы
  base: "/BookJournal/",
  plugins: [vue()],
  build: {
    target: "esnext", // Разрешает использование Top-level await при сборке
  },
  esbuild: {
    supported: {
      "top-level-await": true, // Явно указывает esbuild поддерживать эту фичу
    },
  },
});
