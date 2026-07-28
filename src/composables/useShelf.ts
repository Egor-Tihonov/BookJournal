import { computed, onMounted, ref, watch } from "vue";
import { useJournal } from "../stores/journal";
import type { Book, BookStatus } from "../types";

/**
 * Постраничная загрузка книг одной полки (want/reading/read) из IndexedDB.
 * Грузит только видимое окно — не всю библиотеку.
 */
export function useShelf(status: BookStatus, pageSize: number) {
  const journal = useJournal();
  const books = ref<Book[]>([]);

  const total = computed(() => journal.counts[status]);
  const hasMore = computed(() => books.value.length < total.value);

  // Защита от повторной подгрузки той же страницы (scroll-события летят пачками).
  let loading = false;

  async function loadMore() {
    if (loading || !hasMore.value) return;
    loading = true;
    try {
      const more = await journal.fetchShelf(status, books.value.length, pageSize);
      books.value = [...books.value, ...more];
    } finally {
      loading = false;
    }
  }

  onMounted(() => {
    loadMore();
  });

  // При любой мутации книг (добавление/удаление/смена статуса) перезагружаем
  // окно того же размера, что было загружено (но не меньше первой страницы).
  watch(
    () => journal.booksVersion,
    async () => {
      const size = Math.max(books.value.length, pageSize);
      books.value = await journal.fetchShelf(status, 0, size);
    },
  );

  return { books, hasMore, loadMore, total };
}
