<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useJournal } from '../../stores/journal'
import { useModals } from '../../stores/modals'
import type { Book, EntryKind } from '../../types'
import { displayTitle } from '../../utils'
import Cover from '../Cover.vue'

const modals = useModals()
const journal = useJournal()

// Книга выбирается либо снаружи (из карточки), либо тут — из читаемых.
const pickedId = ref<string | null>(null)
const kind = ref<EntryKind>('thought')
const text = ref('')
const page = ref('')

const activeId = computed(() => modals.noteBookId ?? pickedId.value)
const book = computed(() => (activeId.value ? journal.getBook(activeId.value) : undefined))

// Список книг «Читаю» грузится из БД при открытии модалки — целиком его в сторе больше нет.
const readingBooks = ref<Book[]>([])
watch(
  () => modals.noteOpen,
  (open) => {
    if (open) journal.fetchShelf('reading', 0, 50).then((list) => (readingBooks.value = list))
  },
)

const textareaEl = ref<HTMLTextAreaElement | null>(null)

// Сброс полей при каждом открытии.
watch(
  () => modals.noteOpen,
  (open) => {
    if (open) {
      pickedId.value = null
      kind.value = 'thought'
      text.value = ''
      page.value = ''
    }
  },
)

// autoFocus: фокус на textarea, когда редактор появляется в открытой модалке.
watch(
  () => modals.noteOpen && !!book.value,
  (visible) => {
    if (visible) {
      nextTick(() => textareaEl.value?.focus())
    }
  },
)

const save = () => {
  if (!book.value || !text.value.trim()) return
  journal.addEntry({
    bookId: book.value.id,
    kind: kind.value,
    text: text.value,
    page: page.value ? Number(page.value) : undefined,
  })
  modals.closeNote()
}

// Закрытие по Escape (стандартное поведение модального окна).
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && modals.noteOpen) {
    modals.closeNote()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <template v-if="modals.noteOpen">
      <div
        class="modal fade show"
        style="display: block"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        @click.self="modals.closeNote()"
      >
        <div class="modal-dialog modal-dialog-centered bj-sheet-dialog">
          <div class="modal-content bj-sheet">
            <button class="x" type="button" aria-label="Закрыть" @click="modals.closeNote()">
              ×
            </button>

            <template v-if="!book">
              <!-- Выбор книги из тех, что читаются сейчас -->
              <template v-if="readingBooks.length > 0">
                <h3>Записать мысль</h3>
                <div class="sub">Выберите книгу, которую читаете сейчас.</div>
                <div class="results">
                  <button
                    v-for="b in readingBooks"
                    :key="b.id"
                    type="button"
                    class="res"
                    @click="pickedId = b.id"
                  >
                    <Cover :gradient="b.cover" />
                    <div>
                      <b>{{ displayTitle(b) }}</b>
                      <small v-if="b.author">{{ b.author }}</small>
                    </div>
                  </button>
                </div>
              </template>

              <!-- Нет книг в процессе чтения -->
              <div v-else class="empty" style="padding: 28px 8px 8px">
                <div class="ic">✎</div>
                <h3>Сейчас вы ничего не читаете</h3>
                <p>
                  Записи можно делать только для книги в процессе чтения. Откройте книгу и переключите
                  статус на «Читаю».
                </p>
                <RouterLink class="bj-btn" to="/library" @click="modals.closeNote()">
                  К библиотеке
                </RouterLink>
              </div>
            </template>

            <!-- Редактор записи для выбранной книги -->
            <template v-else>
              <div class="bk">
                <Cover :gradient="book.cover" />
                {{ displayTitle(book) }}&nbsp;›
              </div>

              <div class="seg" style="margin-bottom: 16px">
                <div :class="kind === 'thought' ? 'on' : undefined" @click="kind = 'thought'">
                  Мысль
                </div>
                <div :class="kind === 'quote' ? 'on' : undefined" @click="kind = 'quote'">
                  Цитата
                </div>
              </div>

              <textarea
                ref="textareaEl"
                :placeholder="kind === 'quote' ? 'Перепиши цитату…' : 'Запиши, пока не выветрилось…'"
                v-model="text"
              />

              <div class="foot">
                <label class="page">
                  стр.&nbsp;
                  <input
                    type="number"
                    min="1"
                    v-model="page"
                    placeholder="—"
                    style="width: 48px; border: none; background: transparent; color: inherit; font: inherit"
                  />
                </label>
                <button class="bj-btn" type="button" :disabled="!text.trim()" @click="save">
                  Сохранить в дневник
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="modals.closeNote()"></div>
    </template>
  </Teleport>
</template>
