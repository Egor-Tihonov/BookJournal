<script setup lang="ts">
import { computed } from 'vue'
import { useModals } from '../stores/modals'
import { useSync } from '../stores/sync'

const modals = useModals()
const sync = useSync()

// Точка на облачке: показывает, что синку нужно внимание пользователя.
const dot = computed(() => {
  if (sync.status === 'syncing') return 'syncing'
  if (sync.status === 'error') return 'err'
  if (sync.status === 'needAuth') return 'warn'
  if (sync.pendingPush) return 'warn'
  return null
})
</script>

<template>
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
    <span v-if="dot" class="sync-dot" :class="dot" />
  </button>
</template>
