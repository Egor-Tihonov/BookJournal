<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useJournal } from '../stores/journal'
import { useModals } from '../stores/modals'
import { useSidebar } from '../composables/useSidebar'

const modals = useModals()
const journal = useJournal()
const route = useRoute()
const sidebar = useSidebar()

// На странице книги своя кнопка записи (рядом с «Завершить книгу») — в верхнем баре дублировать не нужно.
const onBookPage = computed(() => route.path.startsWith('/book/'))
</script>

<template>
  <div class="top">
    <!-- Бургер: скрыть/показать навигационную панель. На телефонах её заменяет нижняя навигация. -->
    <button
      class="burger-btn"
      type="button"
      :aria-label="sidebar.collapsed.value ? 'Показать меню' : 'Скрыть меню'"
      @click="sidebar.toggle()"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    </button>
    <input
      class="search"
      type="search"
      placeholder="⌕  Поиск по библиотеке…"
      v-model="journal.librarySearch"
      aria-label="Поиск по библиотеке"
    />
    <div class="spacer" />
    <button v-if="!onBookPage" class="bj-btn ghost" type="button" @click="modals.openNote()">
      ✎ Записать мысль
    </button>
    <RouterLink class="bj-btn" to="/add"> + Добавить книгу </RouterLink>
  </div>
</template>
