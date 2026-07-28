// Авторизация в Google через vue3-google-login (обёртка над Google Identity Services).
// Здесь только получение access-токена; работа с файлами Drive — в drive.ts.

import { googleSdkLoaded } from "vue3-google-login";

export const GOOGLE_CLIENT_ID =
  "782838705901-n4mi50qjqum15bbu21jq59gko3rj61dn.apps.googleusercontent.com";

const SCOPE =
  "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";

// Ключ localStorage для персистентного кэша токена — переживает перезагрузку страницы.
const TOKEN_STORAGE_KEY = "bj-google-token";

// Кэш токена в памяти модуля, при старте подгружается из localStorage.
let cachedToken = "";
let tokenExpiresAt = 0;

try {
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (raw) {
    const saved = JSON.parse(raw) as {
      token: string;
      expiresAt: number;
      scope?: string;
    };
    // Токен, выданный под другой набор разрешений (scope), не используем —
    // иначе после расширения scope почта/профиль не подтянутся до истечения токена.
    if (saved.scope === SCOPE) {
      cachedToken = saved.token ?? "";
      tokenExpiresAt = saved.expiresAt ?? 0;
    }
  }
} catch {
  // битые данные в localStorage — просто игнорируем, токен запросится заново
}

/** Сохраняет токен в localStorage, чтобы он пережил перезагрузку страницы. */
function persistToken(token: string, expiresAt: number) {
  localStorage.setItem(
    TOKEN_STORAGE_KEY,
    JSON.stringify({ token, expiresAt, scope: SCOPE }),
  );
}

/** Есть ли сейчас валидный (не истёкший) токен в кэше. */
export function hasValidToken(): boolean {
  return Boolean(cachedToken) && Date.now() < tokenExpiresAt - 60_000;
}

/** Возвращает access-токен: если он ещё живой (с запасом 60 сек) — без попапа, иначе спрашивает пользователя. */
export function getAccessToken(): Promise<string> {
  if (hasValidToken()) {
    return Promise.resolve(cachedToken);
  }

  return new Promise<string>((resolve, reject) => {
    // googleSdkLoaded сам подгружает скрипт GIS и зовёт колбэк, когда SDK готов
    googleSdkLoaded((google) => {
      google.accounts.oauth2
        .initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPE,
          callback: (resp) => {
            if (!resp.access_token) {
              reject(new Error("Не удалось получить доступ к Google Drive"));
              return;
            }
            cachedToken = resp.access_token;
            tokenExpiresAt =
              Date.now() + Number(resp.expires_in ?? 3600) * 1000;
            persistToken(cachedToken, tokenExpiresAt);
            resolve(cachedToken);
          },
          error_callback: () => {
            reject(new Error("Авторизация в Google отменена"));
          },
        })
        .requestAccessToken();
    });
  });
}

export interface GoogleUserInfo {
  name?: string;
  email?: string;
}

/** Запрашивает имя и email владельца токена. */
export async function fetchUserInfo(token: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Не удалось получить профиль Google (${res.status})`);
  return res.json();
}

/** Отзывает доступ у Google и полностью чистит локальный кэш токена. */
export function revokeAccess(): Promise<void> {
  const token = cachedToken;

  const clear = () => {
    cachedToken = "";
    tokenExpiresAt = 0;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  if (!token) {
    clear();
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    googleSdkLoaded((google) => {
      google.accounts.oauth2.revoke(token, () => {
        clear();
        resolve();
      });
    });
  });
}
