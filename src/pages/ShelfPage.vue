<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { STATUS_META, type BookStatus } from '../types'
import { useShelf } from '../composables/useShelf'
import Cover from '../components/Cover.vue'
import { displayTitle, truncate } from '../utils'

const route = useRoute()
const router = useRouter()

const status = computed(() => route.params.status as string)
const isValidStatus = (s: string): s is BookStatus =>
  s === 'want' || s === 'reading' || s === 'read'

if (!isValidStatus(status.value)) {
  router.replace('/library')
}

// useShelf вызывается только если статус валиден — иначе редирект выше уже запущен.
const shelf = useShelf(isValidStatus(status.value) ? status.value : 'want', 12)

const loadingMore = ref(false)
const loadMore = async () => {
  loadingMore.value = true
  try {
    await shelf.loadMore()
  } finally {
    loadingMore.value = false
  }
}
</script>

<template>
  <section v-if="isValidStatus(status)" class="view">
    <div class="wrap">
      <RouterLink class="back" to="/library"> ‹ Библиотека </RouterLink>
      <div class="eyebrow">МОЯ БИБЛИОТЕКА</div>
      <h1>{{ STATUS_META[status].label }} — {{ shelf.total.value }}</h1>

      <div class="shelf">
        <RouterLink v-for="b in shelf.books.value" :key="b.id" class="tile" :to="`/book/${b.id}`">
          <Cover :gradient="b.cover" />
          <b>{{ displayTitle(b) }}</b>
          <span v-if="b.reason" class="hint">{{ truncate(b.reason) }}</span>
        </RouterLink>
      </div>

      <button
        v-if="shelf.hasMore.value"
        class="bj-btn ghost more-btn"
        type="button"
        :disabled="loadingMore"
        @click="loadMore"
      >
        Показать ещё
      </button>
    </div>
  </section>
</template>
