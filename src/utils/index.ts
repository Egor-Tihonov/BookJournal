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

/** Относительное время для напоминаний: «сегодня», «вчера», «5 дней назад», «3 месяца назад». */
export function timeAgo(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  // Считаем календарные дни, а не полные сутки: запись вчера вечером — это «вчера»,
  // даже если с момента записи прошло меньше 24 часов.
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round(
    (startOfDay(new Date()) - startOfDay(then)) / 86_400_000,
  );
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 7) return `${days} ${plural(days, ["день", "дня", "дней"])} назад`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `${w} ${plural(w, ["неделю", "недели", "недель"])} назад`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `${m} ${plural(m, ["месяц", "месяца", "месяцев"])} назад`;
  }
  const y = Math.floor(days / 365);
  return `${y} ${plural(y, ["год", "года", "лет"])} назад`;
}

/** Название для отображения: «Оригинал (Перевод)», если у книги есть русский перевод. */
export function displayTitle(book: { title: string; titleRu?: string }): string {
  return book.titleRu ? `${book.title} (${book.titleRu})` : book.title;
}

/** Обрезка длинного текста для подсказок: «начало…». */
export function truncate(text: string, max = 90): string {
  const t = text.trim();
  return t.length <= max ? t : t.slice(0, max).trimEnd() + "…";
}
