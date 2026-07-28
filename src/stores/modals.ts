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

  // Общая модалка подтверждения опасных действий (вместо системного confirm()).
  const confirmOpen = ref(false)
  const confirmText = ref('')
  const confirmActionLabel = ref('Удалить')
  let confirmResolve: ((ok: boolean) => void) | null = null

  /** Показывает модалку подтверждения и возвращает true, если пользователь согласился. */
  const openConfirm = (text: string, actionLabel = 'Удалить') => {
    confirmText.value = text
    confirmActionLabel.value = actionLabel
    confirmOpen.value = true
    return new Promise<boolean>((resolve) => {
      confirmResolve = resolve
    })
  }

  const closeConfirm = (ok: boolean) => {
    confirmOpen.value = false
    confirmResolve?.(ok)
    confirmResolve = null
  }

  return {
    noteOpen,
    noteBookId,
    reviewOpen,
    reviewBookId,
    driveOpen,
    confirmOpen,
    confirmText,
    confirmActionLabel,
    openNote,
    openReview,
    closeNote,
    closeReview,
    openDrive,
    closeDrive,
    openConfirm,
    closeConfirm,
  }
})
