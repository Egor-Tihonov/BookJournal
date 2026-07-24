<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useModals } from '../stores/modals'

const modals = useModals()
const query = ref('')
</script>

<template>
  <div class="top">
    <input
      class="search"
      type="search"
      placeholder="⌕  Поиск по библиотеке…"
      v-model="query"
      aria-label="Поиск по библиотеке"
    />
    <div class="spacer" />
    <button class="bj-btn ghost" type="button" @click="modals.openNote()">
      ✎ Записать мысль
    </button>
    <RouterLink class="bj-btn" to="/add"> + Добавить книгу </RouterLink>
  </div>
</template>
