// Слияние двух снимков данных (локального и удалённого из Google Drive) в один.
// Чистая функция без Vue/Pinia/Dexie — только типы данных. Сам движок синхронизации
// (когда и как читать/писать Drive, ставить снимки в очередь и т.п.) — отдельная задача.

import type { Book, DiaryEntry, Deletion } from "../../types";
import { TOMBSTONE_TTL_DAYS } from "../../config";

/** Снимок данных для слияния. */
export interface Snapshot {
  books: Book[];
  entries: DiaryEntry[];
  deletions: Deletion[];
}

export interface MergeResult {
  merged: Snapshot;
  changedFromLocal: boolean; // объединённый снимок отличается от local (нужно применить к локальной БД)
  changedFromRemote: boolean; // объединённый снимок отличается от remote (нужно выгрузить в Drive)
}

const TOMBSTONE_TTL_MS = TOMBSTONE_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Привести произвольный снимок (в т.ч. бэкап v1 без deletions/updatedAt) к каноничному
 * виду Snapshot — используется движком синхронизации перед слиянием скачанных данных.
 */
export function normalizeSnapshot(data: {
  books: Book[];
  entries: DiaryEntry[];
  deletions?: Deletion[];
}): Snapshot {
  const now = () => new Date().toISOString();
  return {
    books: data.books.map((b) => ({
      ...b,
      statusChangedAt: b.statusChangedAt || now(),
      updatedAt: b.updatedAt || b.statusChangedAt || now(),
    })),
    entries: data.entries.map((e) => ({
      ...e,
      updatedAt: e.updatedAt || e.createdAt || now(),
    })),
    deletions: data.deletions ?? [],
  };
}

/**
 * Канонический вид снимка для сравнения содержимого — сортировка по id + JSON.stringify.
 * Это O(n log n) по размеру данных (сортировка) — для объёмов личного дневника этого достаточно,
 * специальный алгоритм диффа тут избыточен.
 */
function canonicalize(snapshot: Snapshot): string {
  const books = [...snapshot.books].sort((a, b) => a.id.localeCompare(b.id));
  const entries = [...snapshot.entries].sort((a, b) => a.id.localeCompare(b.id));
  const deletions = [...snapshot.deletions].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify({ books, entries, deletions });
}

/**
 * Слить надгробия удаления двух сторон: по id побеждает более свежее deletedAt.
 * Надгробия старше 90 дней отбрасываются, чтобы список не рос вечно.
 */
function mergeDeletions(local: Deletion[], remote: Deletion[]): Map<string, Deletion> {
  const byId = new Map<string, Deletion>();
  for (const d of [...local, ...remote]) {
    const existing = byId.get(d.id);
    if (!existing || d.deletedAt > existing.deletedAt) byId.set(d.id, d);
  }
  const cutoff = Date.now() - TOMBSTONE_TTL_MS;
  for (const [id, d] of byId) {
    if (new Date(d.deletedAt).getTime() < cutoff) byId.delete(id);
  }
  return byId;
}

/** Слить сущности (книги или записи) двух сторон по id: при совпадении побеждает бо́льший updatedAt. */
function mergeEntities<T extends { id: string; updatedAt: string }>(
  local: T[],
  remote: T[],
): Map<string, T> {
  const byId = new Map<string, T>();
  for (const item of [...local, ...remote]) {
    const existing = byId.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) byId.set(item.id, item);
  }
  return byId;
}

/**
 * Слить локальный и удалённый снимки в один. Единый принцип — при конфликте
 * побеждает более свежая дата (updatedAt у сущности или deletedAt у надгробия).
 * Не мутирует входные аргументы, результат детерминирован.
 */
export function mergeSnapshots(local: Snapshot, remote: Snapshot): MergeResult {
  const deletionsById = mergeDeletions(local.deletions, remote.deletions);

  const booksById = mergeEntities(local.books, remote.books);
  // Правка свежее удаления — книга остаётся, надгробие снимается.
  // Удаление свежее (или тех же секунд) правки — книга выкидывается, надгробие остаётся.
  for (const [id, book] of booksById) {
    const tombstone = deletionsById.get(id);
    if (!tombstone || tombstone.type !== "book") continue;
    if (tombstone.deletedAt > book.updatedAt) {
      booksById.delete(id);
    } else {
      deletionsById.delete(id);
    }
  }

  const entriesById = mergeEntities(local.entries, remote.entries);
  for (const [id, entry] of entriesById) {
    const tombstone = deletionsById.get(id);
    if (!tombstone || tombstone.type !== "entry") continue;
    if (tombstone.deletedAt > entry.updatedAt) {
      entriesById.delete(id);
    } else {
      deletionsById.delete(id);
    }
  }
  // Записи, чья книга не пережила слияние (удалена/отсутствует) — тоже выкидываем.
  for (const [id, entry] of entriesById) {
    if (!booksById.has(entry.bookId)) entriesById.delete(id);
  }

  const merged: Snapshot = {
    books: [...booksById.values()],
    entries: [...entriesById.values()],
    deletions: [...deletionsById.values()],
  };

  const changedFromLocal = canonicalize(merged) !== canonicalize(local);
  const changedFromRemote = canonicalize(merged) !== canonicalize(remote);

  return { merged, changedFromLocal, changedFromRemote };
}
