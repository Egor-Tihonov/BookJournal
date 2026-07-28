export type BookStatus = "want" | "reading" | "read";

/** Сессия чтения. Открытая (endedAt отсутствует) = «идёт сейчас». */
export interface ReadingSession {
  id: string;
  startedAt: string;
  endedAt?: string;
}

export interface Book {
  id: string;
  title: string;
  /** Русский перевод названия — заполняется, если книга искалась по-русски,
      а в каталоге нашлась под английским названием. Показывается в скобках. */
  titleRu?: string;
  author: string;
  year?: number;
  pages?: number;

  cover?: string;
  status: BookStatus;
  /** ISO-дата, когда книга попала в текущий статус — нужно для сортировки полки «свежие сверху». */
  statusChangedAt: string;

  reason?: string;

  review?: string;

  rating?: number;

  sessions?: ReadingSession[];
}

export type EntryKind = "thought" | "quote";

export interface DiaryEntry {
  id: string;
  bookId: string;
  kind: EntryKind;
  text: string;
  /** Номер страницы (для цитат) */
  page?: number;
  /** ISO-дата создания */
  createdAt: string;
}

export const STATUS_META: Record<BookStatus, { label: string; color: string }> =
  {
    reading: { label: "Читаю", color: "#9c5a3c" },
    want: { label: "Хочу читать", color: "#c7bba6" },
    read: { label: "Прочитал", color: "#7c8b76" },
  };

export const STATUS_ORDER: BookStatus[] = ["reading", "want", "read"];

/** Порядок для сегмент-контролов (форма добавления, переключатель статуса в книге). */
export const STATUS_SEG_ORDER: BookStatus[] = ["want", "reading", "read"];
