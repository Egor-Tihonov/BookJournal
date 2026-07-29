<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Sidebar from './Sidebar.vue'
import { useSidebar } from '../composables/useSidebar'
import TopBar from './TopBar.vue'
import BottomNav from './BottomNav.vue'
import QuickNoteModal from './modals/QuickNoteModal.vue'
import ReviewModal from './modals/ReviewModal.vue'
import DriveModal from './modals/DriveModal.vue'
import ConfirmModal from './modals/ConfirmModal.vue'
import SessionModal from './modals/SessionModal.vue'

const route = useRoute()
const bodyRef = ref<HTMLDivElement | null>(null)
const { collapsed: sideCollapsed } = useSidebar()

// Сброс прокрутки контента при смене экрана (как в исходном макете).
watch(
  () => route.path,
  () => {
    bodyRef.value?.scrollTo({ top: 0 })
  },
)
</script>

<template>
  <Sidebar v-show="!sideCollapsed" />
  <main class="main">
    <TopBar />
    <div class="body" ref="bodyRef">
      <RouterView />
    </div>
  </main>

  <!-- Нижняя навигация — только на узких экранах (см. index.css) -->
  <BottomNav />

  <QuickNoteModal />
  <ReviewModal />
  <DriveModal />
  <ConfirmModal />
  <SessionModal />
</template>
