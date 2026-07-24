<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useJournal } from '../../stores/journal'
import { useModals } from '../../stores/modals'

const modals = useModals()
const journal = useJournal()

const book = computed(() => (modals.reviewBookId ? journal.getBook(modals.reviewBookId) : undefined))

const text = ref('')
const rating = ref(0)

watch(
  () => [modals.reviewOpen, book.value] as const,
  ([open]) => {
    if (open) {
      text.value = book.value?.review ?? ''
      rating.value = book.value?.rating ?? 0
    }
  },
)

const save = () => {
  if (!book.value) return
  journal.updateBook(book.value.id, {
    review: text.value.trim() || undefined,
    rating: rating.value || undefined,
  })
  modals.closeReview()
}

// Закрытие по Escape (стандартное поведение модального окна).
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && modals.reviewOpen) {
    modals.closeReview()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <template v-if="modals.reviewOpen">
      <div
        class="modal fade show"
        style="display: block"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        @click.self="modals.closeReview()"
      >
        <div class="modal-dialog modal-dialog-centered bj-sheet-dialog">
          <div class="modal-content bj-sheet">
            <button class="x" type="button" aria-label="Закрыть" @click="modals.closeReview()">
              ×
            </button>
            <h3>Впечатление</h3>
            <div class="sub">
              Когда дочитаешь — оставь себе пару слов. Не для оценки, для памяти.
            </div>
            <textarea placeholder="Что осталось после книги…" v-model="text" />
            <div class="foot" style="border: none">
              <div>
                <div class="flabel" style="margin: 0 0 9px">
                  ОЦЕНКА · ТОЛЬКО ДЛЯ ВАС
                </div>
                <div class="dots">
                  <i
                    v-for="n in [1, 2, 3, 4, 5]"
                    :key="n"
                    :class="n <= rating ? undefined : 'off'"
                    role="button"
                    :aria-label="`Оценка ${n}`"
                    @click="rating = n === rating ? 0 : n"
                  />
                </div>
              </div>
              <button class="bj-btn" type="button" :disabled="!book" @click="save">
                Сохранить
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="modals.closeReview()"></div>
    </template>
  </Teleport>
</template>
