<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useJournal } from '../stores/journal'
import { STATUS_META, STATUS_ORDER } from '../types'
import UserMenu from './UserMenu.vue'
import ThemeToggle from './ThemeToggle.vue'

const journal = useJournal()
const route = useRoute()

// NavLink to="/library" end — активна только при точном совпадении пути.
const libraryActive = computed(() => route.path === '/library')
// NavLink to="/feed" без end — активна и на вложенных путях.
const feedActive = computed(() => route.path === '/feed' || route.path.startsWith('/feed/'))
</script>

<template>
  <aside class="side">
    <RouterLink to="/" class="brand">
      <span class="logo" />
      <span>
        <b>Book Journal</b>
        <small>дневник чтения</small>
      </span>
    </RouterLink>

    <nav class="bj-nav">
      <RouterLink to="/library" :class="libraryActive ? 'on' : undefined">
        <!-- книга -->
        <svg
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
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        Библиотека
      </RouterLink>
      <RouterLink to="/feed" :class="feedActive ? 'on' : undefined">
        <!-- лента записей -->
        <svg
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
          <line x1="9" y1="6" x2="20" y2="6" />
          <line x1="9" y1="12" x2="20" y2="12" />
          <line x1="9" y1="18" x2="20" y2="18" />
          <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
        </svg>
        Лента дневника
      </RouterLink>
    </nav>

    <div class="label">СТАТУСЫ</div>
    <RouterLink v-for="status in STATUS_ORDER" :key="status" to="/library" class="stat">
      <span class="l">
        <span class="dot" :style="{ background: STATUS_META[status].color }" />
        {{ STATUS_META[status].label }}
      </span>
      <span class="n">{{ journal.counts[status] }}</span>
    </RouterLink>

    <div class="grow" />
    <ThemeToggle />
    <UserMenu variant="side" />
  </aside>
</template>
