function detectLang(text: string): "ru" | "en" | "unknown" {
  if (/[а-яё]/i.test(text)) return "ru";
  if (/[a-z]/i.test(text)) return "en";
  return "unknown";
}

/**
 * Бесплатный перевод через неофициальный endpoint Google Translate (gtx).
 * Ответ — вложенный массив: data[0] — сегменты перевода, в каждом [0] — текст.
 * При сбое возвращает null — поиск продолжается без перевода.
 */
async function translate(
  text: string,
  from: string,
  to: string,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      client: "gtx",
      sl: from,
      tl: to,
      dt: "t",
      q: text,
    });
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?${params}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const segments = data?.[0];
    if (!Array.isArray(segments)) return null;
    const translated = segments
      .map((s: unknown) => (Array.isArray(s) ? (s[0] ?? "") : ""))
      .join("")
      .trim();
    return translated || null;
  } catch {
    return null;
  }
}

export { detectLang, translate };
