import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useModals = defineStore('modals', () => {
  const noteOpen = ref(false)
  const noteBookId = ref<string | null>(null)
  const reviewOpen = ref(false)
  const reviewBookId = ref<string | null>(null)

  /** bookId опционален: «Записать мысль» из верхней панели может открываться без выбранной книги */
  const openNote = (bookId: string | null = null) => {
    noteBookId.value = bookId
    noteOpen.value = true
  }

  const openReview = (bookId: string | null = null) => {
    reviewBookId.value = bookId
    reviewOpen.value = true
  }

  const closeNote = () => {
    noteOpen.value = false
  }

  const closeReview = () => {
    reviewOpen.value = false
  }

  return {
    noteOpen,
    noteBookId,
    reviewOpen,
    reviewBookId,
    openNote,
    openReview,
    closeNote,
    closeReview,
  }
})
