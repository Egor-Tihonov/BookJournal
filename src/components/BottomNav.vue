<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useModals } from '../stores/modals'
import UserMenu from './UserMenu.vue'

/** Нижняя навигация для телефона (видна только на узких экранах, см. index.css). */
const route = useRoute()
const modals = useModals()

const libraryActive = computed(() => route.path === '/library')
const feedActive = computed(() => route.path.startsWith('/feed'))
const addActive = computed(() => route.path === '/add')
</script>

<template>
  <nav class="bottomnav">
    <RouterLink to="/library" :class="libraryActive ? 'on' : undefined">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
      Библиотека
    </RouterLink>

    <RouterLink to="/feed" :class="feedActive ? 'on' : undefined">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <line x1="9" y1="6" x2="20" y2="6" />
        <line x1="9" y1="12" x2="20" y2="12" />
        <line x1="9" y1="18" x2="20" y2="18" />
        <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
      </svg>
      Лента
    </RouterLink>

    <button type="button" @click="modals.openNote()">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
      Мысль
    </button>

    <RouterLink to="/add" :class="addActive ? 'on' : undefined">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Добавить
    </RouterLink>

    <UserMenu variant="nav" />
  </nav>
</template>
