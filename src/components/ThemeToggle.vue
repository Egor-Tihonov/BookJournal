<script setup lang="ts">
import { ref } from 'vue'

// Явный выбор темы хранится в localStorage ('light' | 'dark'); без записи — системная.
// Ранний скрипт в index.html ставит data-theme до отрисовки, чтобы тема не мигала.
const KEY = 'bj-theme'

const isDarkNow = () => {
  const saved = localStorage.getItem(KEY)
  if (saved === 'dark' || saved === 'light') return saved === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const dark = ref(isDarkNow())

const toggle = () => {
  dark.value = !dark.value
  const next = dark.value ? 'dark' : 'light'
  localStorage.setItem(KEY, next)
  document.documentElement.dataset.theme = next
}
</script>

<!-- Кнопка называет тему, КОТОРУЮ включит клик -->
<template>
  <button class="theme-toggle" type="button" @click="toggle">
    <!-- солнце (сейчас темно — клик включит светлую) -->
    <svg
      v-if="dark"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
    <!-- луна (сейчас светло — клик включит тёмную) -->
    <svg
      v-else
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
    {{ dark ? 'Светлая тема' : 'Тёмная тема' }}
  </button>
</template>
