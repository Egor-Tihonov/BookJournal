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
  }
}

export const db = new MyBookShelf(); // регистрация нашей бд, база называется так, версия такая, таблицы и индексы такие,
// создание / открытие бд ленивое при первом обращении
