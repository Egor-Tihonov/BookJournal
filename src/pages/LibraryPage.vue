<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useJournal } from '../stores/journal'
import { useModals } from '../stores/modals'
import { STATUS_META, type Book } from '../types'
import Cover from '../components/Cover.vue'
import EmptyState from '../components/EmptyState.vue'
import { countBooks, countEntries, detectLang, displayTitle, formatDate, truncate } from '../utils'

const journal = useJournal()
const modals = useModals()

// Поиск: русский запрос ищет по title и titleRu, английский — только по title
const query = computed(() => journal.librarySearch.trim().toLowerCase())
const matches = (b: Book) => {
  if (!query.value) return true
  if (b.title.toLowerCase().includes(query.value)) return true
  return (
    detectLang(query.value) === 'ru' &&
    (b.titleRu?.toLowerCase().includes(query.value) ?? false)
  )
}

const reading = computed(() => journal.booksByStatus('reading').filter(matches))
const want = computed(() => journal.booksByStatus('want').filter(matches))
const read = computed(() => journal.booksByStatus('read').filter(matches))

const nothingFound = computed(
  () =>
    query.value !== '' &&
    reading.value.length + want.value.length + read.value.length === 0,
)

const latestQuote = computed(() => journal.allEntries().find((e) => e.kind === 'quote'))
const recallBook = computed(() =>
  latestQuote.value ? journal.books.find((b) => b.id === latestQuote.value!.bookId) : undefined,
)

// Полки «ХОЧУ ЧИТАТЬ» / «ПРОЧИТАЛ»
const shelves = computed<{ title: string; books: Book[] }[]>(() => [
  { title: 'ХОЧУ ЧИТАТЬ', books: want.value },
  { title: 'ПРОЧИТАЛ', books: read.value },
])

const clearAll = () => {
  if (!confirm(`Удалить все книги (${journal.totalBooks}) вместе с записями? Это необратимо.`)) return
  journal.clearAll()
}
</script>

<template>
  <section v-if="journal.totalBooks === 0" class="view">
    <div class="wrap">
      <div class="eyebrow">МОЯ БИБЛИОТЕКА</div>
      <div class="titlebar">
        <h1>Здесь будут ваши книги</h1>
        <div class="titlebar-actions">
          <button
            class="cloud-btn"
            type="button"
            title="Google Drive"
            aria-label="Google Drive"
            @click="modals.openDrive()"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
          </button>
        </div>
      </div>
      <EmptyState
        title="Библиотека пуста"
        text="Добавьте первую книгу — и ведите по ней дневник чтения: мысли, цитаты, впечатления."
      >
        <template #action>
          <RouterLink class="bj-btn" to="/add"> + Добавить книгу </RouterLink>
        </template>
      </EmptyState>
    </div>
  </section>

  <section v-else class="view">
    <div class="wrap">
      <div class="eyebrow">МОЯ БИБЛИОТЕКА</div>
      <div class="titlebar">
        <h1>{{ countBooks(journal.totalBooks) }}, {{ countEntries(journal.totalEntries) }}</h1>
        <div class="titlebar-actions">
          <button
            class="cloud-btn"
            type="button"
            title="Google Drive"
            aria-label="Google Drive"
            @click="modals.openDrive()"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
          </button>
          <button
            class="trash-btn"
            type="button"
            title="Очистить библиотеку"
            aria-label="Очистить библиотеку"
            @click="clearAll"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        </div>
      </div>

      <EmptyState
        v-if="nothingFound"
        icon="⌕"
        title="Ничего не нашлось"
        :text="`По запросу «${journal.librarySearch.trim()}» в библиотеке нет книг.`"
      />

      <RouterLink
        v-if="!query && latestQuote && recallBook"
        class="recall"
        :to="`/book/${recallBook.id}`"
      >
        <Cover :gradient="recallBook.cover" />
        <div>
          <div class="tag">
            <span class="dot" :style="{ background: STATUS_META.reading.color }" />
            ОДНАЖДЫ ТЫ ЗАПИСАЛ
          </div>
          <q>{{ latestQuote.text }}</q>
          <div class="meta">
            {{ displayTitle(recallBook) }} · {{ recallBook.author }} · {{ formatDate(latestQuote.createdAt) }}
          </div>
        </div>
      </RouterLink>

      <template v-if="reading.length > 0">
        <div class="sec">
          <h2>ЧИТАЮ</h2>
          <span>{{ reading.length }}</span>
        </div>
        <div class="reading">
          <RouterLink v-for="b in reading" :key="b.id" class="bookrow" :to="`/book/${b.id}`">
            <Cover :gradient="b.cover" />
            <div class="info">
              <b>{{ displayTitle(b) }}</b>
              <div v-if="b.author" class="au">{{ b.author }}</div>
              <div class="st">
                {{ journal.entriesForBook(b.id).length > 0 ? countEntries(journal.entriesForBook(b.id).length) : 'нет записей' }}
              </div>
            </div>
            <span v-if="b.reason" class="hint">{{ truncate(b.reason) }}</span>
          </RouterLink>
        </div>
      </template>

      <template v-for="shelf in shelves" :key="shelf.title">
        <template v-if="shelf.books.length > 0">
          <div class="sec">
            <h2>{{ shelf.title }}</h2>
            <span>{{ shelf.books.length }}</span>
          </div>
          <div class="shelf">
            <RouterLink v-for="b in shelf.books" :key="b.id" class="tile" :to="`/book/${b.id}`">
              <Cover :gradient="b.cover" />
              <b>{{ displayTitle(b) }}</b>
              <span v-if="b.reason" class="hint">{{ truncate(b.reason) }}</span>
            </RouterLink>
            <RouterLink class="tile add" to="/add">
              <Cover>+</Cover>
              <b>добавить</b>
            </RouterLink>
          </div>
        </template>
      </template>
    </div>
  </section>
</template>
