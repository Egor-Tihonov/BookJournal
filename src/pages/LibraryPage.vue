<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useJournal } from '../stores/journal'
import { STATUS_META, type Book } from '../types'
import Cover from '../components/Cover.vue'
import EmptyState from '../components/EmptyState.vue'
import { countBooks, countEntries, formatDate } from '../utils'

const journal = useJournal()

const reading = computed(() => journal.booksByStatus('reading'))
const want = computed(() => journal.booksByStatus('want'))
const read = computed(() => journal.booksByStatus('read'))

const latestQuote = computed(() => journal.allEntries().find((e) => e.kind === 'quote'))
const recallBook = computed(() =>
  latestQuote.value ? journal.books.find((b) => b.id === latestQuote.value!.bookId) : undefined,
)

// Полки «ХОЧУ ЧИТАТЬ» / «ПРОЧИТАЛ»
const shelves = computed<{ title: string; books: Book[] }[]>(() => [
  { title: 'ХОЧУ ЧИТАТЬ', books: want.value },
  { title: 'ПРОЧИТАЛ', books: read.value },
])
</script>

<template>
  <section v-if="journal.totalBooks === 0" class="view">
    <div class="wrap">
      <div class="eyebrow">МОЯ БИБЛИОТЕКА</div>
      <h1>Здесь будут ваши книги</h1>
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
      <h1>{{ countBooks(journal.totalBooks) }}, {{ countEntries(journal.totalEntries) }}</h1>

      <RouterLink
        v-if="latestQuote && recallBook"
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
            {{ recallBook.title }} · {{ recallBook.author }} · {{ formatDate(latestQuote.createdAt) }}
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
              <b>{{ b.title }}</b>
              <div v-if="b.author" class="au">{{ b.author }}</div>
              <div class="st">
                {{ journal.entriesForBook(b.id).length > 0 ? countEntries(journal.entriesForBook(b.id).length) : 'нет записей' }}
              </div>
            </div>
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
              <b>{{ b.title }}</b>
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
