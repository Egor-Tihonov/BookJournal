<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useModals } from '../../stores/modals'

const modals = useModals()

// Закрытие по Escape = отказ (стандартное поведение модального окна).
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && modals.confirmOpen) {
    modals.closeConfirm(false)
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <template v-if="modals.confirmOpen">
      <div
        class="modal fade show"
        style="display: block"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        @click.self="modals.closeConfirm(false)"
      >
        <div class="modal-dialog modal-dialog-centered bj-sheet-dialog">
          <div class="modal-content bj-sheet">
            <button
              class="x"
              type="button"
              aria-label="Закрыть"
              @click="modals.closeConfirm(false)"
            >
              ×
            </button>

            <h3>Подтверждение</h3>
            <div class="sub">{{ modals.confirmText }}</div>

            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px">
              <button class="bj-btn ghost danger" type="button" @click="modals.closeConfirm(true)">
                {{ modals.confirmActionLabel }}
              </button>
              <button class="bj-btn ghost" type="button" @click="modals.closeConfirm(false)">
                Отмена
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="modals.closeConfirm(false)"></div>
    </template>
  </Teleport>
</template>
