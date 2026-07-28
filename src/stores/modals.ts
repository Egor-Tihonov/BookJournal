import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useModals = defineStore('modals', () => {
  const noteOpen = ref(false)
  const noteBookId = ref<string | null>(null)
  const reviewOpen = ref(false)
  const reviewBookId = ref<string | null>(null)
  const driveOpen = ref(false)

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

  const openDrive = () => {
    driveOpen.value = true
  }

  const closeDrive = () => {
    driveOpen.value = false
  }

  return {
    noteOpen,
    noteBookId,
    reviewOpen,
    reviewBookId,
    driveOpen,
    openNote,
    openReview,
    closeNote,
    closeReview,
    openDrive,
    closeDrive,
  }
})
