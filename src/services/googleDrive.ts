// Интеграция с Google Drive: авторизация через vue3-google-login (обёртка над
// Google Identity Services) и хранение бэкапа в скрытой папке приложения
// (appDataFolder), недоступной пользователю напрямую.

import { googleSdkLoaded } from "vue3-google-login";

export const GOOGLE_CLIENT_ID =
  "782838705901-n4mi50qjqum15bbu21jq59gko3rj61dn.apps.googleusercontent.com";

const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
export const BACKUP_FILE_NAME = "bookjournal-backup.json";

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
            tokenExpiresAt = Date.now() + Number(resp.expires_in ?? 3600) * 1000;
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

interface DriveFile {
  id: string;
  modifiedTime: string;
}

/** Ищет файл бэкапа в скрытой папке приложения. Возвращает null, если ещё не сохраняли. */
export async function findBackupFile(token: string): Promise<DriveFile | null> {
  const url =
    "https://www.googleapis.com/drive/v3/files" +
    `?spaces=appDataFolder&q=name='${BACKUP_FILE_NAME}'&fields=files(id,modifiedTime)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok)
    throw new Error(`Не удалось получить список файлов Drive (${res.status})`);
  const data = await res.json();
  const files: DriveFile[] = data.files ?? [];
  return files[0] ?? null;
}

/** Загружает содержимое бэкапа в Drive: обновляет существующий файл или создаёт новый. */
export async function uploadBackup(
  token: string,
  content: string,
): Promise<void> {
  const existing = await findBackupFile(token);

  if (existing) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: content,
      },
    );
    if (!res.ok)
      throw new Error(`Не удалось обновить бэкап в Drive (${res.status})`);
    return;
  }

  // Файла ещё нет — создаём через multipart-запрос: метаданные (в т.ч. parents: appDataFolder) + содержимое.
  const boundary = "bookjournal_backup_boundary";
  const metadata = { name: BACKUP_FILE_NAME, parents: ["appDataFolder"] };
  const body =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    "Content-Type: application/json\r\n\r\n" +
    `${content}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!res.ok)
    throw new Error(`Не удалось создать бэкап в Drive (${res.status})`);
}

/** Скачивает содержимое файла бэкапа по его id. */
export async function downloadBackup(
  token: string,
  id: string,
): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok)
    throw new Error(`Не удалось скачать бэкап из Drive (${res.status})`);
  return res.text();
}
