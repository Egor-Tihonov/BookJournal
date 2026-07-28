import { computed, ref } from "vue";
import { defineStore } from "pinia";
import Dexie from "dexie";
import { db } from "../data/db";
import type { Book, BookStatus, DiaryEntry, EntryKind } from "../types";

/** Данные для создания книги — без служебных полей (id/сессии их выставляет стор). */
export interface NewBook {
  title: string;
  titleRu?: string;
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

/** Формат файла резервной копии — используется стором drive.ts. */
export interface BackupData {
  version: number;
  exportedAt: string;
  books: Book[];
  entries: DiaryEntry[];
}

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

/** Плоская копия для записи в IndexedDB — без реактивных Vue-прокси. */
const snapshot = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const useJournal = defineStore("journal", () => {
  // Кэш ТОЛЬКО тех книг, что реально понадобились экрану (полка/страница книги и т.п.).
  // Полный список книг в память больше не грузим — из БД читаем страницами (см. useShelf).
  const booksById = ref<Record<string, Book>>({});
  // Счётчики книг по статусам — считаются в БД, не требуют загрузки самих книг.
  const counts = ref<Record<BookStatus, number>>({ want: 0, reading: 0, read: 0 });
  // Инкрементится при любой мутации книг — по нему списки на страницах перезагружают своё окно.
  const booksVersion = ref(0);

  const entries = ref<DiaryEntry[]>([]);

  // Строка поиска по библиотеке: пишет TopBar, фильтр применяет LibraryPage.
  const librarySearch = ref("");

  // --- Загрузка при старте (вызывается из main.ts до mount) ---
  async function init() {
    entries.value = await db.entries.toArray();
    await refreshCounts();
  }

  /** Пересчитать счётчики книг по статусам (без загрузки самих книг). */
  async function refreshCounts() {
    const [want, reading, read] = await Promise.all([
      db.books.where("status").equals("want").count(),
      db.books.where("status").equals("reading").count(),
      db.books.where("status").equals("read").count(),
    ]);
    counts.value = { want, reading, read };
  }

  // --- Счётчики ---
  const totalBooks = computed(
    () => counts.value.want + counts.value.reading + counts.value.read,
  );
  const totalEntries = computed(() => entries.value.length);

  // --- Чтение (синхронно, из кэша) ---
  const getBook = (id: string) => booksById.value[id];

  /** Положить книги в кэш (не мутирует счётчики/версию — только чтение). */
  function cacheBooks(list: Book[]) {
    for (const b of list) booksById.value[b.id] = b;
  }

  /**
   * Загрузить страницу книг статуса, свежие сверху (по statusChangedAt).
   * Результат кэшируется и возвращается.
   */
  async function fetchShelf(
    status: BookStatus,
    offset: number,
    limit: number,
  ): Promise<Book[]> {
    const list = await db.books
      .where("[status+statusChangedAt]")
      .between([status, Dexie.minKey], [status, Dexie.maxKey])
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
    cacheBooks(list);
    return list;
  }

  /** Загрузить одну книгу по id, если её ещё нет в кэше. */
  async function loadBook(id: string) {
    if (booksById.value[id]) return;
    const book = await db.books.get(id);
    if (book) cacheBooks([book]);
  }

  /** Догрузить в кэш книги по списку id, которых там ещё нет. */
  async function loadBooksByIds(ids: string[]) {
    const missing = ids.filter((id) => !booksById.value[id]);
    if (missing.length === 0) return;
    const list = await db.books.bulkGet(missing);
    cacheBooks(list.filter((b): b is Book => !!b));
  }

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
      titleRu: data.titleRu?.trim() || undefined,
      author: data.author.trim(),
      year: data.year,
      pages: data.pages,
      cover: data.cover,
      status: data.status,
      statusChangedAt: now(),
      reason: data.reason?.trim() || undefined,
      // если книга добавлена сразу в статусе «Читаю» — открываем первую сессию
      sessions:
        data.status === "reading" ? [{ id: uid(), startedAt: now() }] : [],
    };
    booksById.value[book.id] = book;
    counts.value[book.status]++;
    booksVersion.value++;
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
    booksVersion.value++;
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
    const prevStatus = book.status;
    book.sessions = sessions;
    book.status = status;
    book.statusChangedAt = now();
    counts.value[prevStatus]--;
    counts.value[status]++;
    booksVersion.value++;
    persistBook(book);
  }

  /** Удалить книгу вместе с её записями дневника. */
  function removeBook(id: string) {
    const book = booksById.value[id];
    if (book) {
      counts.value[book.status]--;
      delete booksById.value[id];
      booksVersion.value++;
    }
    entries.value = entries.value.filter((e) => e.bookId !== id);
    db.books
      .delete(id)
      .catch((e) => console.error("Не удалось удалить книгу", e));
    db.entries
      .where("bookId")
      .equals(id)
      .delete()
      .catch((e) => console.error("Не удалось удалить записи книги", e));
  }

  /** Очистить библиотеку полностью: все книги и все записи. */
  function clearAll() {
    booksById.value = {};
    counts.value = { want: 0, reading: 0, read: 0 };
    booksVersion.value++;
    entries.value = [];
    db.books.clear().catch((e) => console.error("Не удалось очистить книги", e));
    db.entries
      .clear()
      .catch((e) => console.error("Не удалось очистить записи", e));
  }

  // --- Резервное копирование (используется стором drive.ts) ---

  /** Снимок всех данных для выгрузки в бэкап (книги читаются из БД целиком). */
  async function exportData(): Promise<BackupData> {
    return {
      version: 1,
      exportedAt: now(),
      books: await db.books.toArray(),
      entries: snapshot(entries.value),
    };
  }

  /** Восстановить данные из бэкапа: заменяет книги и записи целиком, включая IndexedDB. */
  async function importData(data: BackupData) {
    if (
      typeof data !== "object" ||
      data === null ||
      !Array.isArray(data.books) ||
      !Array.isArray(data.entries)
    ) {
      throw new Error("Файл бэкапа повреждён или имеет неверный формат");
    }

    const books = data.books.map((b) => ({
      ...b,
      statusChangedAt: b.statusChangedAt || now(),
    }));

    await db.transaction("rw", db.books, db.entries, async () => {
      await db.books.clear();
      await db.entries.clear();
      await db.books.bulkPut(books);
      await db.entries.bulkPut(data.entries);
    });

    booksById.value = {};
    entries.value = data.entries;
    await refreshCounts();
    booksVersion.value++;
  }

  return {
    // данные
    entries,
    counts,
    booksVersion,
    totalBooks,
    totalEntries,
    // поиск по библиотеке
    librarySearch,
    // чтение
    getBook,
    fetchShelf,
    loadBook,
    loadBooksByIds,
    entriesForBook,
    allEntries,
    // запись
    addBook,
    addEntry,
    updateBook,
    setStatus,
    removeBook,
    clearAll,
    // резервное копирование
    exportData,
    importData,
    // жизненный цикл
    init,
    refreshCounts,
  };
});
