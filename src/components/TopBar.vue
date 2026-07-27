<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useJournal } from '../stores/journal'
import { useModals } from '../stores/modals'

const modals = useModals()
const journal = useJournal()
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
    <button class="bj-btn ghost" type="button" @click="modals.openNote()">
      ✎ Записать мысль
    </button>
    <RouterLink class="bj-btn" to="/add"> + Добавить книгу </RouterLink>
  </div>
</template>
