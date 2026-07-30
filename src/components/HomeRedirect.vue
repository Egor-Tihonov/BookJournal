<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useJournal } from '../stores/journal'
import type { Book } from '../types'

/**
 * Точка входа «/»: открываем книгу с самой свежей записью дневника — ту, в которую
 * последней что-то записывали. Записей ещё нет — последнюю начатую «Читаю», иначе библиотеку.
 * Записи уже в памяти: journal.init() отрабатывает до монтирования (см. main.ts).
 */
const journal = useJournal()
const router = useRouter()

const lastStarted = (b: Book) =>
  (b.sessions ?? []).reduce((max, s) => (s.startedAt > max ? s.startedAt : max), '')

onMounted(async () => {
  const lastEntry = journal.allEntries()[0] // отсортированы по createdAt по убыванию
  if (lastEntry) {
    router.replace(`/book/${lastEntry.bookId}`)
    return
  }
  const reading = await journal.fetchShelf('reading', 0, 50)
  const current = [...reading].sort((a, b) => lastStarted(b).localeCompare(lastStarted(a)))[0]
  router.replace(current ? `/book/${current.id}` : '/library')
})
</script>

<template>
  <!-- ничего не рендерим — только редирект -->
</template>
