// Авторизация в Google по схеме authorization code flow.
//
// Раньше access-токен получался прямо в браузере (token flow) и лежал в localStorage —
// его мог прочитать любой JS на странице, а продление требовало попапа раз в час.
// Теперь: GIS-попап отдаёт одноразовый код -> наш Cloudflare Worker (/auth/exchange)
// меняет его на токены; refresh-токен остаётся в httpOnly-куке (JS его не видит),
// а access-токен живёт ТОЛЬКО в памяти этой вкладки и продлевается тихо через /auth/refresh.

import { googleSdkLoaded } from "vue3-google-login";
import { GOOGLE_CLIENT_ID } from "../../config";

const SCOPE =
  "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";

// Ключ старого хранилища токена — больше не используется, подчищаем за прошлой версией.
localStorage.removeItem("bj-google-token");

// Access-токен только в памяти модуля: переживает навигацию по SPA, но не перезагрузку
// страницы — после неё тихо восстанавливается через /auth/refresh по httpOnly-куке.
let cachedToken = "";
let tokenExpiresAt = 0;

/** Бросается, когда тихо продлить сессию нельзя — нужен интерактивный вход кликом. */
export class AuthRequiredError extends Error {
  constructor() {
    super("Нужен вход в Google");
    this.name = "AuthRequiredError";
  }
}

/** Есть ли сейчас живой (не истёкший) access-токен в памяти. */
export function hasValidToken(): boolean {
  return Boolean(cachedToken) && Date.now() < tokenExpiresAt - 60_000;
}

function rememberToken(token: string, expiresInSec: number) {
  cachedToken = token;
  tokenExpiresAt = Date.now() + expiresInSec * 1000;
}

/** Запрос к нашему Worker. credentials: include — чтобы ездила httpOnly-кука. */
async function authApi(path: string, body?: unknown): Promise<Response> {
  return fetch(path, {
    method: "POST",
    credentials: "include",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Тихо возвращает access-токен: из памяти или через /auth/refresh по куке.
 * Попапов не открывает никогда. Если продлить нечем — AuthRequiredError,
 * дальше нужен interactiveSignIn() по клику пользователя.
 */
export async function getAccessToken(): Promise<string> {
  if (hasValidToken()) return cachedToken;

  const resp = await authApi("/auth/refresh").catch(() => null);
  if (resp?.ok) {
    const data = (await resp.json()) as { access_token: string; expires_in: number };
    rememberToken(data.access_token, data.expires_in);
    return cachedToken;
  }
  throw new AuthRequiredError();
}

/**
 * Интерактивный вход (требует клика — иначе браузер заблокирует попап):
 * GIS-попап выбора аккаунта -> одноразовый код -> обмен на токены в Worker.
 */
export function interactiveSignIn(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    googleSdkLoaded((google) => {
      google.accounts.oauth2
        .initCodeClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPE,
          ux_mode: "popup",
          callback: async (resp: { code?: string }) => {
            if (!resp.code) {
              reject(new Error("Не удалось получить доступ к Google Drive"));
              return;
            }
            try {
              const r = await authApi("/auth/exchange", { code: resp.code });
              if (!r.ok) throw new Error("Не удалось завершить вход");
              const data = (await r.json()) as { access_token: string; expires_in: number };
              rememberToken(data.access_token, data.expires_in);
              resolve(cachedToken);
            } catch (e) {
              reject(e instanceof Error ? e : new Error("Не удалось завершить вход"));
            }
          },
          error_callback: () => {
            reject(new Error("Авторизация в Google отменена"));
          },
        })
        .requestCode();
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

/** Выход: Worker отзывает refresh-токен у Google и стирает куку, память чистим сами. */
export async function revokeAccess(): Promise<void> {
  cachedToken = "";
  tokenExpiresAt = 0;
  await authApi("/auth/logout").catch(() => {
    // сеть недоступна — локально всё равно вышли, кука истечёт сама
  });
}
