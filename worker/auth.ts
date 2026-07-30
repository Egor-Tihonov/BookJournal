// Серверная часть авторизации (Cloudflare Worker): обмен authorization code на токены
// и фоновое продление access-токена по refresh-токену.
//
// Зачем это здесь, а не в браузере:
//  - обмен кода требует client secret — в браузерном коде его видел бы любой;
//  - refresh-токен хранится в httpOnly-куке, JS страницы его прочитать не может,
//    поэтому даже успешный XSS не получает долгоживущий доступ к Drive.
//
// Эндпоинты (все POST, все отвечают JSON):
//  /auth/exchange {code} -> {access_token, expires_in} + Set-Cookie с refresh-токеном
//  /auth/refresh         -> {access_token, expires_in} по куке (204 нет куки -> 401)
//  /auth/logout          -> ревокация refresh-токена у Google + очистка куки
//
// Защита от CSRF: кука SameSite=Strict (чужой сайт её не отправит) плюс явная
// проверка заголовка Origin — запросы принимаются только со своего origin.

interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string; // Secret в настройках воркера, в репозитории его нет
  ASSETS: { fetch: (req: Request) => Promise<Response> };
}

const COOKIE_NAME = "bj_refresh";
// Кука живёт полгода; сам refresh-токен Google не истекает по времени,
// но может быть отозван пользователем — тогда /auth/refresh вернёт 401.
const COOKIE_MAX_AGE = 180 * 24 * 3600;
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });

const readCookie = (req: Request, name: string): string => {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
};

// Path=/auth — кука не ездит с каждым запросом за статикой, только на auth-эндпоинты.
const setCookie = (value: string, maxAge: number) =>
  `${COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/auth; HttpOnly; Secure; SameSite=Strict`;

const clearCookie = () => setCookie("", 0);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/auth/")) {
      // Статика приложения. COOP same-origin-allow-popups сохраняет связь страницы
      // с попапом Google-входа (window.opener/postMessage): строгие значения COOP
      // ломают GIS, отсутствие заголовка оставляет предупреждения в консоли.
      const resp = await env.ASSETS.fetch(request);
      const headers = new Headers(resp.headers);
      headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
      return new Response(resp.body, { status: resp.status, headers });
    }

    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }
    // CSRF: принимаем запросы только со своей страницы. SameSite=Strict уже не даст
    // чужому сайту отправить куку, но Origin-проверка закрывает и остальные случаи.
    const origin = request.headers.get("origin");
    if (origin !== url.origin) {
      return json({ error: "forbidden_origin" }, 403);
    }

    if (url.pathname === "/auth/exchange") return exchange(request, env);
    if (url.pathname === "/auth/refresh") return refresh(request, env);
    if (url.pathname === "/auth/logout") return logout(request);
    return json({ error: "not_found" }, 404);
  },
};

/** Обмен одноразового кода на пару токенов. Код приходит из GIS-попапа (ux_mode: popup). */
async function exchange(request: Request, env: Env): Promise<Response> {
  let code = "";
  try {
    code = ((await request.json()) as { code?: string }).code ?? "";
  } catch {
    /* некорректное тело — обработается ниже как пустой код */
  }
  if (!code) return json({ error: "no_code" }, 400);

  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      // Для кода, полученного через GIS-попап, Google требует именно это значение
      redirect_uri: "postmessage",
      grant_type: "authorization_code",
    }),
  });
  const data = (await resp.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!resp.ok || !data.access_token) {
    // error_description отдаём как есть — это диагностика Google, секретов в ней нет
    return json({ error: data.error ?? "exchange_failed", detail: data.error_description }, 401);
  }

  const headers: Record<string, string> = {};
  // refresh_token приходит только при первом согласии (или после prompt=consent);
  // если его нет — старый токен у Google ещё жив, куку не трогаем.
  if (data.refresh_token) {
    headers["set-cookie"] = setCookie(data.refresh_token, COOKIE_MAX_AGE);
  }
  return json({ access_token: data.access_token, expires_in: data.expires_in ?? 3600 }, 200, headers);
}

/** Тихое продление: по refresh-токену из куки получаем новый access-токен. */
async function refresh(request: Request, env: Env): Promise<Response> {
  const refreshToken = readCookie(request, COOKIE_NAME);
  if (!refreshToken) return json({ error: "no_refresh_token" }, 401);

  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  const data = (await resp.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!resp.ok || !data.access_token) {
    // Токен отозван или протух (сменили пароль, отозвали доступ) — чистим куку,
    // клиент покажет обычный вход.
    return json({ error: data.error ?? "refresh_failed", detail: data.error_description }, 401, {
      "set-cookie": clearCookie(),
    });
  }
  return json({ access_token: data.access_token, expires_in: data.expires_in ?? 3600 });
}

/** Выход: отзываем refresh-токен у Google и стираем куку. */
async function logout(request: Request): Promise<Response> {
  const refreshToken = readCookie(request, COOKIE_NAME);
  if (refreshToken) {
    // Ошибку ревокации игнорируем — кука в любом случае очищается
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
    }).catch(() => {});
  }
  return json({ ok: true }, 200, { "set-cookie": clearCookie() });
}
