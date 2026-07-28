import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue"; // или ваш фреймворк, если это не Vue

export default defineConfig({
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
