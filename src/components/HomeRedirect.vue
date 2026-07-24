<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useJournal } from '../stores/journal'

/**
 * Точка входа «/»: открываем книгу, которую читаем сейчас —
 * ту, где была сделана последняя запись (иначе первую «Читаю», иначе любую).
 * Если книг нет — ведём в библиотеку.
 */
const journal = useJournal()
const router = useRouter()

const latest = journal.allEntries()[0]
const current =
  (latest && journal.getBook(latest.bookId)) || journal.booksByStatus('reading')[0] || journal.books[0]
router.replace(current ? `/book/${current.id}` : '/library')
</script>

<template>
  <!-- ничего не рендерим — только редирект -->
</template>
