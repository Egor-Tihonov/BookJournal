import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { db } from "../data/catalog";
import type { Book, BookStatus, DiaryEntry, EntryKind } from "../types";

/** Данные для создания книги — без служебных полей (id/сессии их выставляет стор). */
export interface NewBook {
  title: string;
  author: string;
  year?: number;
  pages?: number;
  cover?: string;
  status: BookStatus;
  reason?: string;
}

/** Данные для создания записи дневника. */
export interface NewEntry {
  bookId: string;
  kind: EntryKind;
  text: string;
  page?: number;
}

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

/** Плоская копия для записи в IndexedDB — без реактивных Vue-прокси. */
const snapshot = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const useJournal = defineStore("journal", () => {
  const books = ref<Book[]>([]);
  const entries = ref<DiaryEntry[]>([]);

  // --- Загрузка при старте (вызывается из main.ts до mount) ---
  async function init() {
    books.value = await db.books.toArray();
    entries.value = await db.entries.toArray();
  }

  // --- Счётчики ---
  const totalBooks = computed(() => books.value.length);
  const totalEntries = computed(() => entries.value.length);

  // --- Чтение (синхронно, из кэша) ---
  const getBook = (id: string) => books.value.find((b) => b.id === id);
  const booksByStatus = (status: BookStatus) =>
    books.value.filter((b) => b.status === status);
  const entriesForBook = (bookId: string) =>
    entries.value
      .filter((e) => e.bookId === bookId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const allEntries = () =>
    [...entries.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // --- Фоновая запись в IndexedDB (put = upsert по первичному ключу id) ---
  const persistBook = (book: Book) =>
    db.books
      .put(snapshot(book))
      .catch((e) => console.error("Не удалось сохранить книгу", e));
  const persistEntry = (entry: DiaryEntry) =>
    db.entries
      .put(snapshot(entry))
      .catch((e) => console.error("Не удалось сохранить запись", e));

  /** Добавить книгу. Возвращает созданную книгу сразу (до завершения записи в БД). */
  function addBook(data: NewBook): Book {
    const book: Book = {
      id: uid(),
      title: data.title.trim(),
      author: data.author.trim(),
      year: data.year,
      pages: data.pages,
      cover: data.cover,
      status: data.status,
      reason: data.reason?.trim() || undefined,
      // если книга добавлена сразу в статусе «Читаю» — открываем первую сессию
      sessions:
        data.status === "reading" ? [{ id: uid(), startedAt: now() }] : [],
    };
    books.value.push(book);
    persistBook(book);
    return book;
  }

  /** Добавить запись дневника (мысль/цитата). */
  function addEntry(data: NewEntry): DiaryEntry {
    const entry: DiaryEntry = {
      id: uid(),
      bookId: data.bookId,
      kind: data.kind,
      text: data.text.trim(),
      page: data.page,
      createdAt: now(),
    };
    entries.value.push(entry);
    persistEntry(entry);
    return entry;
  }

  /** Точечно обновить книгу (финальный отзыв, оценка и т.п.). */
  function updateBook(id: string, patch: Partial<Book>) {
    const book = getBook(id);
    if (!book) return;
    Object.assign(book, patch);
    persistBook(book);
  }

  /**
   * Сменить статус книги и вести сессии чтения
   * «Читаю» открывает новую сессию, любой другой статус закрывает текущую.
   */
  function setStatus(id: string, status: BookStatus) {
    const book = getBook(id);
    if (!book || book.status === status) return;
    const sessions = book.sessions ?? [];
    if (status === "reading") {
      sessions.push({ id: uid(), startedAt: now() });
    } else {
      const ongoing = sessions.find((s) => !s.endedAt);
      if (ongoing) ongoing.endedAt = now();
    }
    book.sessions = sessions;
    book.status = status;
    persistBook(book);
  }

  return {
    // данные
    books,
    entries,
    totalBooks,
    totalEntries,
    // чтение
    getBook,
    booksByStatus,
    entriesForBook,
    allEntries,
    // запись
    addBook,
    addEntry,
    updateBook,
    setStatus,
    // жизненный цикл
    init,
  };
});
