<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useJournal } from '../stores/journal'
import { useModals } from '../stores/modals'
import { STATUS_META, type Book, type BookStatus } from '../types'
import { useShelf } from '../composables/useShelf'
import Cover from '../components/Cover.vue'
import EmptyState from '../components/EmptyState.vue'
import CloudButton from '../components/CloudButton.vue'
import { SHELF_PAGE_SIZE } from '../config'
import { countBooks, countEntries, detectLang, displayTitle, timeAgo, truncate } from '../utils'

const journal = useJournal()
const modals = useModals()

// Полки грузятся постранично из IndexedDB, а не все книги разом.
const readingShelf = useShelf('reading', SHELF_PAGE_SIZE)
const wantShelf = useShelf('want', SHELF_PAGE_SIZE)
const readShelf = useShelf('read', SHELF_PAGE_SIZE)

// Поиск: русский запрос ищет по title и titleRu, английский — только по title
// Применяется к уже загруженному окну (полноценный поиск по всей библиотеке — отдельная задача).
const query = computed(() => journal.librarySearch.trim().toLowerCase())
const matches = (b: Book) => {
  if (!query.value) return true
  if (b.title.toLowerCase().includes(query.value)) return true
  return (
    detectLang(query.value) === 'ru' &&
    (b.titleRu?.toLowerCase().includes(query.value) ?? false)
  )
}

const reading = computed(() => readingShelf.books.value.filter(matches))
const want = computed(() => wantShelf.books.value.filter(matches))
const read = computed(() => readShelf.books.value.filter(matches))

const nothingFound = computed(
  () =>
    query.value !== '' &&
    reading.value.length + want.value.length + read.value.length === 0,
)

// Напоминание «однажды ты записал»: цитата или мысль из прошлого (старше недели).
// Выбор стабилен в течение дня (индекс от номера дня) — воспоминание меняется раз в сутки,
// а не при каждом обновлении страницы. Пока старых записей нет — показываем самую свежую.
const memoryEntry = computed(() => {
  const all = journal.allEntries()
  if (all.length === 0) return undefined
  const weekAgo = Date.now() - 7 * 86_400_000
  const past = all.filter((e) => new Date(e.createdAt).getTime() < weekAgo)
  const pool = past.length > 0 ? past : all
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  return pool[dayIndex % pool.length]
})
// Длинное воспоминание сворачиваем до нескольких строк; «Читать дальше» раскрывает.
const memoryExpanded = ref(false)
const memoryLong = computed(() => (memoryEntry.value?.text.length ?? 0) > 220)

// Книга из напоминания может быть не в кэше (не входит ни в одно загруженное окно) — догружаем точечно.
watch(
  memoryEntry,
  (e) => {
    memoryExpanded.value = false
    if (e) journal.loadBooksByIds([e.bookId])
  },
  { immediate: true },
)
const recallBook = computed(() =>
  memoryEntry.value ? journal.getBook(memoryEntry.value.bookId) : undefined,
)

// Полки «ХОЧУ ЧИТАТЬ» / «ПРОЧИТАЛ»: первые 6 + ссылка «смотреть далее», если книг больше.
const shelves = computed(() => [
  { title: 'ХОЧУ ЧИТАТЬ', status: 'want' as BookStatus, shelf: wantShelf, filtered: want.value },
  { title: 'ПРОЧИТАЛ', status: 'read' as BookStatus, shelf: readShelf, filtered: read.value },
])

const clearAll = async () => {
  const ok = await modals.openConfirm(
    `Удалить все книги (${journal.totalBooks}) вместе с записями? Это необратимо.`,
    'Удалить всё',
  )
  if (!ok) return
  await journal.clearAll()
}

// Карусель «ЧИТАЮ»: подгрузка следующей порции, когда долистали ленту почти до конца.
const readingEl = ref<HTMLElement | null>(null)
const onReadingScroll = () => {
  const el = readingEl.value
  if (!el) return
  if (
    el.scrollLeft + el.clientWidth >= el.scrollWidth - 200 &&
    readingShelf.hasMore.value
  ) {
    readingShelf.loadMore()
  }
}
</script>

<template>
  <section v-if="journal.totalBooks === 0" class="view">
    <div class="wrap">
      <div class="eyebrow">МОЯ БИБЛИОТЕКА</div>
      <div class="titlebar">
        <h1>Здесь будут ваши книги</h1>
        <div class="titlebar-actions">
          <CloudButton />
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
          <CloudButton />
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
        v-if="!query && memoryEntry && recallBook"
        class="recall"
        :to="`/book/${recallBook.id}`"
      >
        <Cover :gradient="recallBook.cover" />
        <div>
          <div class="tag">
            <span class="dot" :style="{ background: STATUS_META.reading.color }" />
            {{ memoryEntry.kind === 'quote' ? 'ОДНАЖДЫ ТЫ ВЫПИСАЛ ЦИТАТУ' : 'ОДНАЖДЫ ТЫ ЗАПИСАЛ МЫСЛЬ' }}
          </div>
          <!-- Мета сверху: низ карточки — место действия («Читать дальше» / «Свернуть») -->
          <div class="meta">
            {{
              [displayTitle(recallBook), recallBook.author, timeAgo(memoryEntry.createdAt)]
                .filter(Boolean)
                .join(' · ')
            }}
          </div>
          <div class="txt" :class="{ collapsed: memoryLong && !memoryExpanded }">
            <q>{{ memoryEntry.text }}</q>
            <button
              v-if="memoryLong && !memoryExpanded"
              class="more"
              type="button"
              @click.stop.prevent="memoryExpanded = true"
            >
              Читать дальше
            </button>
          </div>
          <button
            v-if="memoryLong && memoryExpanded"
            class="less"
            type="button"
            @click.stop.prevent="memoryExpanded = false"
          >
            Свернуть
          </button>
        </div>
      </RouterLink>

      <template v-if="reading.length > 0">
        <div class="sec">
          <h2>ЧИТАЮ</h2>
          <span>{{ readingShelf.total.value }}</span>
        </div>
        <div class="reading" ref="readingEl" @scroll.passive="onReadingScroll">
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

      <template v-for="entry in shelves" :key="entry.title">
        <template v-if="entry.filtered.length > 0">
          <div class="sec">
            <h2>{{ entry.title }}</h2>
            <span>{{ entry.shelf.total.value }}</span>
          </div>
          <div class="shelf">
            <RouterLink v-for="b in entry.filtered" :key="b.id" class="tile" :to="`/book/${b.id}`">
              <Cover :gradient="b.cover" />
              <b>{{ displayTitle(b) }}</b>
              <span v-if="b.reason" class="hint">{{ truncate(b.reason) }}</span>
            </RouterLink>
            <RouterLink class="tile add" to="/add">
              <Cover>+</Cover>
              <b>добавить</b>
            </RouterLink>
          </div>
          <RouterLink
            v-if="entry.shelf.total.value > 6"
            class="bj-btn ghost more-btn"
            :to="`/library/shelf/${entry.status}`"
          >
            Смотреть далее ({{ entry.shelf.total.value }})
          </RouterLink>
        </template>
      </template>
    </div>
  </section>
</template>
