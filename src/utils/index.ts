export { detectLang, translate } from "./language_perform";

/** Русское склонение: plural(2, ['книга','книги','книг']) -> 'книги' */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return forms[1];
  return forms[2];
}

export function countBooks(n: number): string {
  return `${n} ${plural(n, ["книга", "книги", "книг"])}`;
}

export function countEntries(n: number): string {
  return `${n} ${plural(n, ["запись", "записи", "записей"])}`;
}

const dateFmt = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
}

/** Название для отображения: «Оригинал (Перевод)», если у книги есть русский перевод. */
export function displayTitle(book: { title: string; titleRu?: string }): string {
  return book.titleRu ? `${book.title} (${book.titleRu})` : book.title;
}
