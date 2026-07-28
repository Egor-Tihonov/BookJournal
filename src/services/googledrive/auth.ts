// Авторизация в Google через vue3-google-login (обёртка над Google Identity Services).
// Здесь только получение access-токена; работа с файлами Drive — в drive.ts.

import { googleSdkLoaded } from "vue3-google-login";

export const GOOGLE_CLIENT_ID =
  "782838705901-n4mi50qjqum15bbu21jq59gko3rj61dn.apps.googleusercontent.com";

const SCOPE = "https://www.googleapis.com/auth/drive.appdata";

// Кэш токена в памяти модуля — переживает открытие/закрытие модалки, но не перезагрузку страницы.
let cachedToken = "";
let tokenExpiresAt = 0;

/** Возвращает access-токен: если он ещё живой (с запасом 60 сек) — без попапа, иначе спрашивает пользователя. */
export function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
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
