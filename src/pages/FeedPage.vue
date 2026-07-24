<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useJournal } from '../stores/journal'
import EmptyState from '../components/EmptyState.vue'
import { countEntries, formatDate } from '../utils'

const journal = useJournal()
const entries = computed(() => journal.allEntries())
</script>

<template>
  <section class="view">
    <div class="wrap">
      <div class="eyebrow">ЛЕНТА ДНЕВНИКА</div>
      <h1>{{ entries.length > 0 ? countEntries(entries.length) : 'Лента дневника' }}</h1>

      <EmptyState
        v-if="entries.length === 0"
        icon="◷"
        title="Записей пока нет"
        text="Мысли и цитаты из всех книг будут собираться здесь — от свежих к старым."
      >
        <template #action>
          <RouterLink class="bj-btn" to="/library">К библиотеке</RouterLink>
        </template>
      </EmptyState>

      <div v-else class="timeline" style="margin-top: 28px">
        <div v-for="e in entries" :key="e.id" :class="e.kind === 'quote' ? 'entry q' : 'entry'">
          <div class="h">
            <span class="kind">{{ e.kind === 'quote' ? 'ЦИТАТА' : 'МЫСЛЬ' }}</span>
            <span class="when">
              <template v-if="journal.getBook(e.bookId)">
                <RouterLink class="link" :to="`/book/${journal.getBook(e.bookId)!.id}`">{{ journal.getBook(e.bookId)!.title }}</RouterLink>{{ ' · ' }}
              </template>
              {{ e.kind === 'quote' && e.page ? `стр. ${e.page} · ` : '' }}{{ formatDate(e.createdAt) }}
            </span>
          </div>
          <p>{{ e.text }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
