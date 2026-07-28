// Самопроверка mergeSnapshots — обычный ts-файл, НЕ подключается в приложение
// (в проекте нет тест-фреймворка). Компилируется вместе с проектом (npm run build),
// но вызывать runMergeSelfcheck() нужно вручную (например, из консоли дев-сборки).

import type { Book, Deletion, DiaryEntry } from "../../types";
import { mergeSnapshots, type Snapshot } from "./merge";

// Даты считаем от текущего момента (а не константами в прошлом), иначе они рискуют
// попасть под 90-дневное отсечение старых надгробий и сломать сценарии 3/4/5/6.
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
const T1 = iso(3);
const T2 = iso(2);
const T3 = iso(1);

function makeBook(id: string, updatedAt: string, title = id): Book {
  return {
    id,
    title,
    author: "Автор",
    status: "reading",
    statusChangedAt: updatedAt,
    updatedAt,
  };
}

function makeEntry(id: string, bookId: string, updatedAt: string): DiaryEntry {
  return {
    id,
    bookId,
    kind: "thought",
    text: "заметка",
    createdAt: updatedAt,
    updatedAt,
  };
}

function makeDeletion(id: string, type: Deletion["type"], deletedAt: string): Deletion {
  return { id, type, deletedAt };
}

function emptySnapshot(): Snapshot {
  return { books: [], entries: [], deletions: [] };
}

/** Запускает набор сценариев для mergeSnapshots и возвращает список проваленных проверок. */
export function runMergeSelfcheck(): string[] {
  const failures: string[] = [];
  const check = (label: string, condition: boolean) => {
    if (!condition) failures.push(label);
  };

  // 1. Обе стороны добавили разные книги → обе в merged, оба changed* true.
  {
    const local: Snapshot = { ...emptySnapshot(), books: [makeBook("A", T1)] };
    const remote: Snapshot = { ...emptySnapshot(), books: [makeBook("B", T1)] };
    const result = mergeSnapshots(local, remote);
    check("1: обе книги в merged", result.merged.books.length === 2);
    check(
      "1: содержит A и B",
      result.merged.books.some((b) => b.id === "A") &&
        result.merged.books.some((b) => b.id === "B"),
    );
    check("1: changedFromLocal", result.changedFromLocal === true);
    check("1: changedFromRemote", result.changedFromRemote === true);
    // входы не мутированы
    check("1: local не мутирован", local.books.length === 1);
    check("1: remote не мутирован", remote.books.length === 1);
  }

  // 2. Одна книга правлена с двух сторон → побеждает свежий updatedAt.
  {
    const local: Snapshot = { ...emptySnapshot(), books: [makeBook("X", T1, "Локальная правка")] };
    const remote: Snapshot = { ...emptySnapshot(), books: [makeBook("X", T2, "Удалённая правка")] };
    const result = mergeSnapshots(local, remote);
    check("2: одна книга в merged", result.merged.books.length === 1);
    check(
      "2: победил более свежий updatedAt (remote)",
      result.merged.books[0]?.title === "Удалённая правка",
    );
  }

  // 3. Удаление на одной стороне против старой версии на другой →
  //    книга удалена, её записи удалены.
  {
    const local: Snapshot = {
      books: [],
      entries: [],
      deletions: [makeDeletion("Y", "book", T3)],
    };
    const remote: Snapshot = {
      books: [makeBook("Y", T1)],
      entries: [makeEntry("e1", "Y", T1)],
      deletions: [],
    };
    const result = mergeSnapshots(local, remote);
    check("3: книга удалена", !result.merged.books.some((b) => b.id === "Y"));
    check("3: записи книги удалены", result.merged.entries.length === 0);
  }

  // 4. Правка свежее удаления → книга живёт, надгробие убрано.
  {
    const local: Snapshot = {
      books: [],
      entries: [],
      deletions: [makeDeletion("Z", "book", T1)],
    };
    const remote: Snapshot = { ...emptySnapshot(), books: [makeBook("Z", T2)] };
    const result = mergeSnapshots(local, remote);
    check("4: книга осталась", result.merged.books.some((b) => b.id === "Z"));
    check(
      "4: надгробие снято",
      !result.merged.deletions.some((d) => d.id === "Z"),
    );
  }

  // 5. Пустая локаль против полного remote → merged == remote,
  //    changedFromLocal true, changedFromRemote false.
  {
    const local: Snapshot = emptySnapshot();
    const remote: Snapshot = {
      books: [makeBook("A", T1)],
      entries: [makeEntry("e1", "A", T1)],
      deletions: [makeDeletion("old", "book", T1)],
    };
    const result = mergeSnapshots(local, remote);
    check(
      "5: merged.books == remote.books",
      JSON.stringify(result.merged.books) === JSON.stringify(remote.books),
    );
    check(
      "5: merged.entries == remote.entries",
      JSON.stringify(result.merged.entries) === JSON.stringify(remote.entries),
    );
    check("5: changedFromLocal true", result.changedFromLocal === true);
    check("5: changedFromRemote false", result.changedFromRemote === false);
  }

  // 6. Одинаковые снимки → оба changed* false.
  {
    const snapshotA: Snapshot = {
      books: [makeBook("A", T1)],
      entries: [makeEntry("e1", "A", T1)],
      deletions: [makeDeletion("old", "book", T1)],
    };
    const snapshotB: Snapshot = {
      books: [makeBook("A", T1)],
      entries: [makeEntry("e1", "A", T1)],
      deletions: [makeDeletion("old", "book", T1)],
    };
    const result = mergeSnapshots(snapshotA, snapshotB);
    check("6: changedFromLocal false", result.changedFromLocal === false);
    check("6: changedFromRemote false", result.changedFromRemote === false);
  }

  return failures;
}
