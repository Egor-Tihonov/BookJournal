<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useJournal } from '../stores/journal'
import { useModals } from '../stores/modals'

const modals = useModals()
const journal = useJournal()
const route = useRoute()

// На странице книги своя кнопка записи (рядом с «Завершить книгу») — в верхнем баре дублировать не нужно.
const onBookPage = computed(() => route.path.startsWith('/book/'))
</script>

<template>
  <div class="top">
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
