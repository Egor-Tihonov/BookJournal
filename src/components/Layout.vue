<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Sidebar from './Sidebar.vue'
import TopBar from './TopBar.vue'
import QuickNoteModal from './modals/QuickNoteModal.vue'
import ReviewModal from './modals/ReviewModal.vue'

const route = useRoute()
const bodyRef = ref<HTMLDivElement | null>(null)

// Сброс прокрутки контента при смене экрана (как в исходном макете).
watch(
  () => route.path,
  () => {
    bodyRef.value?.scrollTo({ top: 0 })
  },
)
</script>

<template>
  <Sidebar />
  <main class="main">
    <TopBar />
    <div class="body" ref="bodyRef">
      <RouterView />
    </div>
  </main>

  <QuickNoteModal />
  <ReviewModal />
</template>
