<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useJournal } from '../stores/journal'
import type { Book } from '../types'

/**
 * Точка входа «/»: открываем последнюю книгу, помеченную статусом «Читаю»
 * (у неё самое свежее startedAt среди сессий). Если таких нет — в библиотеку.
 */
const journal = useJournal()
const router = useRouter()

const lastStarted = (b: Book) =>
  (b.sessions ?? []).reduce((max, s) => (s.startedAt > max ? s.startedAt : max), '')

onMounted(async () => {
  const reading = await journal.fetchShelf('reading', 0, 50)
  const current = [...reading].sort((a, b) => lastStarted(b).localeCompare(lastStarted(a)))[0]
  router.replace(current ? `/book/${current.id}` : '/library')
})
</script>

<template>
  <!-- ничего не рендерим — только редирект -->
</template>
