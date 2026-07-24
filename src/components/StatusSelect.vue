<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { STATUS_META, STATUS_SEG_ORDER, type BookStatus } from '../types'

interface Props {
  status: BookStatus
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'change', status: BookStatus): void
}>()

/** Выпадающий список статуса книги (кастомный dropdown в bootstrap-разметке). */
const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const toggle = () => {
  open.value = !open.value
}

const select = (s: BookStatus) => {
  emit('change', s)
  open.value = false
}

// Закрытие по клику вне дропдауна
const onDocumentClick = (e: MouseEvent) => {
  if (!open.value) return
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <div ref="rootEl" class="statusdd dropdown">
    <!-- Кастомный «триггер» дропдауна — без бутстраповских классов кнопки. -->
    <button type="button" class="statusdd-toggle" @click="toggle">
      <span class="dot" :style="{ background: STATUS_META[props.status].color }" />
      {{ STATUS_META[props.status].label }}
      <span class="caret">▾</span>
    </button>
    <div v-if="open" class="statusdd-menu dropdown-menu show">
      <a
        v-for="s in STATUS_SEG_ORDER"
        :key="s"
        role="button"
        tabindex="0"
        class="dropdown-item"
        :class="{ active: s === props.status }"
        @click.prevent="select(s)"
      >
        <span class="dot" :style="{ background: STATUS_META[s].color }" />
        {{ STATUS_META[s].label }}
      </a>
    </div>
  </div>
</template>
