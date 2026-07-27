import { detectLang, translate } from "../utils";

export interface CatalogBook {
  title: string;
  /** Русский перевод английского названия — только для отображения в выдаче. */
  titleRu?: string;
  author: string;
  cover?: string;
}

/**
 * Внешний каталог книг для поиска при добавлении (OpenLibrary).
 * Это НЕ библиотека пользователя — это внешняя база.
 *
 * OpenLibrary ищет в основном по английским названиям, поэтому русский запрос
 * уходит двумя запросами — как есть и в английском переводе — и результаты
 * склеиваются (без дублей). Английский запрос уходит одним запросом.
 */
export async function searchCatalog(query: string): Promise<CatalogBook[]> {
  const q = query.trim();
  if (!q) return [];

  const queries = [q];
  if (detectLang(q) === "ru") {
    const en = await translate(q, "ru", "en");
    if (en) queries.push(en);
  }

  const found = await Promise.all(queries.map(searchOpenLibrary));
  return dedupe(found.flat());
}

/**
 * Дописывает titleRu английским названиям (для отображения «Title (Перевод)»).
 * Мутирует переданные книги. Вызывать постранично, для видимых результатов:
 * переводить всю выдачу разом — это сотня запросов к переводчику на один поиск.
 */
export async function annotateRuTitles(books: CatalogBook[]): Promise<void> {
  await Promise.all(
    books.map(async (b) => {
      if (b.titleRu || detectLang(b.title) !== "en") return;
      const ru = await translate(b.title, "en", "ru");
      if (ru && ru.toLowerCase() !== b.title.toLowerCase()) b.titleRu = ru;
    }),
  );
}

/** Сколько результатов тянем из OpenLibrary на один запрос. */
const RESULTS_LIMIT = 100;

async function searchOpenLibrary(q: string): Promise<CatalogBook[]> {
  try {
    const params = new URLSearchParams({
      q,
      fields: "title,author_name,cover_i",
      limit: String(RESULTS_LIMIT),
    });
    const response = await fetch(
      `https://openlibrary.org/search.json?${params}`,
    );
    if (!response.ok)
      throw new Error(`Error fetching book: ${response.status}`);
    return parseBooks(await response.json());
  } catch (error) {
    console.error(error);
    return [];
  }
}

function parseBooks(data: any): CatalogBook[] {
  return (data.docs || []).map((doc: any) => ({
    title: doc.title,
    // Авторов может быть несколько, берем первого или пишем "Неизвестно"
    author: doc.author_name ? doc.author_name[0] : "Unknown Author",
    // Если есть ID обложки, формируем ссылку на картинку
    cover: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg?default=false`
      : undefined,
  }));
}

/**
 * Скачивает обложку и упаковывает в data-URL (base64), чтобы хранить её
 * прямо в книге в IndexedDB и не ходить на внешний сервер при каждом показе.
 * При сбое возвращает undefined — вызывающий решает, что делать.
 */
export async function downloadCover(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

/** Один и тот же результат может прийти из обоих запросов — убираем дубли. */
function dedupe(books: CatalogBook[]): CatalogBook[] {
  const seen = new Set<string>();
  return books.filter((b) => {
    const key = `${b.title}|${b.author}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
