import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue"; // или ваш фреймворк, если это не Vue

// Минимальный тип для process.env — конфиг выполняется в Node, но @types/node не подключены
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  // На GitHub Pages сайт живёт по адресу /BookJournal/, на Cloudflare — в корне домена.
  // CF=1 задаётся в Build variables проекта Cloudflare.
  base: process.env.CF ? "/" : "/BookJournal/",
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
