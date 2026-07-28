import Dexie, { type Table } from "dexie";
import { Book, DiaryEntry } from "../types.ts";

class MyBookShelf extends Dexie {
  books!: Table<Book, string>; // ручка как обращаться к таблице db.books.add(...), db.books.where(...)
  entries!: Table<DiaryEntry, string>;

  constructor() {
    super("myBookShelf");
    this.version(1).stores({
      // на уровне хранилища как хранить, интерфесы определяют где хранить
      books: "id, title, author, year, cover, status", // первичный ключ id(передаем сами), остальное индексы для выборки
      entries: "id, bookId, createdAt", // первичный ключ id(передаем сами), остальное индексы для выборки
    });
    // v2: добавлен statusChangedAt и составной индекс [status+statusChangedAt] —
    // по нему выбираем книги полки постранично, свежие сверху, без загрузки всех книг в память.
    this.version(2)
      .stores({
        books: "id, title, author, year, cover, status, statusChangedAt, [status+statusChangedAt]",
        entries: "id, bookId, createdAt",
      })
      .upgrade((tx) =>
        tx
          .table("books")
          .toCollection()
          .modify((b) => {
            if (!b.statusChangedAt) b.statusChangedAt = new Date().toISOString();
          }),
      );
  }
}

export const db = new MyBookShelf(); // регистрация нашей бд, база называется так, версия такая, таблицы и индексы такие,
// создание / открытие бд ленивое при первом обращении
