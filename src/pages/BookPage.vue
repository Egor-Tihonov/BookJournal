<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJournal } from '../stores/journal'
import { useModals } from '../stores/modals'
import Cover from '../components/Cover.vue'
import StatusSelect from '../components/StatusSelect.vue'
import EmptyState from '../components/EmptyState.vue'
import type { BookStatus } from '../types'
import { countEntries, displayTitle, formatDate } from '../utils'

const route = useRoute()
const router = useRouter()
const journal = useJournal()
const modals = useModals()

const book = computed(() => {
  const id = route.params.id
  return typeof id === 'string' && id ? journal.getBook(id) : undefined
})

const entries = computed(() => (book.value ? journal.entriesForBook(book.value.id) : []))

const yearLine = computed(() =>
  book.value
    ? [book.value.year, book.value.pages ? `${book.value.pages} стр.` : null]
        .filter(Boolean)
        .join(' · ')
    : '',
)

const sessions = computed(() => book.value?.sessions ?? [])
const ongoing = computed(() => sessions.value.find((s) => !s.endedAt))
const lastCompleted = computed(
  () =>
    sessions.value
      .filter((s) => s.endedAt)
      .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))[0],
)

const onStatusChange = (s: BookStatus) => {
  if (book.value) journal.setStatus(book.value.id, s)
}

const removeBook = () => {
  if (!book.value) return
  if (!confirm(`Удалить «${book.value.title}» вместе с записями дневника?`)) return
  journal.removeBook(book.value.id)
  router.push('/library')
}
</script>

<template>
  <section v-if="!book" class="view">
    <div class="wrap">
      <RouterLink class="back" to="/library"> ‹ Библиотека </RouterLink>
      <EmptyState title="Книга не найдена" text="Возможно, она ещё не добавлена в библиотеку.">
        <template #action>
          <RouterLink class="bj-btn" to="/add"> + Добавить книгу </RouterLink>
        </template>
      </EmptyState>
    </div>
  </section>

  <section v-else class="view">
    <div class="wrap">
      <div class="topbar">
        <RouterLink class="back" to="/library"> ‹ Библиотека </RouterLink>
        <button
          class="trash-btn"
          type="button"
          title="Удалить книгу"
          aria-label="Удалить книгу"
          @click="removeBook"
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
      <div class="book">
        <div class="left">
          <div class="head">
            <Cover :gradient="book.cover" />
            <div>
              <h2>{{ displayTitle(book) }}</h2>
              <div v-if="book.author" class="au">{{ book.author }}</div>
              <div v-if="yearLine" class="yr">{{ yearLine }}</div>

              <!-- Переключатель статуса (выпадающий список) -->
              <StatusSelect :status="book.status" @change="onStatusChange" />
            </div>
          </div>

          <div v-if="book.reason" class="note">
            <div class="t">ПОЧЕМУ ДОБАВИЛ</div>
            <p>{{ book.reason }}</p>
          </div>

          <div v-if="book.review" class="note">
            <div class="t">ВПЕЧАТЛЕНИЕ</div>
            <p>{{ book.review }}</p>
          </div>

          <template v-if="ongoing || lastCompleted">
            <div class="sessions">
              <b>СЕССИИ ЧТЕНИЯ</b>
            </div>
            <div class="scards">
              <div v-if="ongoing" class="scard live">
                <div class="k">идёт сейчас</div>
                <div class="v">с {{ formatDate(ongoing.startedAt) }}</div>
              </div>
              <div v-if="lastCompleted" class="scard">
                <div class="k">
                  {{ book.status === 'read' && !ongoing ? 'прочитано' : 'прошлый раз' }}
                </div>
                <div class="v">{{ formatDate(lastCompleted.endedAt ?? lastCompleted.startedAt) }}</div>
              </div>
            </div>
          </template>

          <button
            v-if="ongoing"
            class="bj-btn"
            type="button"
            @click="modals.openReview(book.id)"
          >
            Завершить книгу
          </button>

        </div>

        <div class="diary">
          <div class="sec">
            <h2>ДНЕВНИК</h2>
            <span>{{ countEntries(entries.length) }}</span>
          </div>
          <EmptyState
            v-if="entries.length === 0"
            icon="✎"
            title="Дневник пуст"
            text="Здесь будут ваши мысли и цитаты по этой книге — в хронологическом порядке."
          >
            <template #action>
              <button
                v-if="book.status === 'reading'"
                class="bj-btn"
                type="button"
                @click="modals.openNote(book.id)"
              >
                + Записать мысль
              </button>
            </template>
          </EmptyState>
          <div v-else class="timeline">
            <div v-for="e in entries" :key="e.id" :class="e.kind === 'quote' ? 'entry q' : 'entry'">
              <div class="h">
                <span class="kind">{{ e.kind === 'quote' ? 'ЦИТАТА' : 'МЫСЛЬ' }}</span>
                <span class="when">
                  {{ (e.page ? `стр. ${e.page} · ` : '') + formatDate(e.createdAt) }}
                </span>
              </div>
              <p>{{ e.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
