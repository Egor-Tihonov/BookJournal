// Работа с файлами Google Drive: бэкап хранится в скрытой папке приложения
// (appDataFolder), недоступной пользователю напрямую. Получение токена — в auth.ts.

export const BACKUP_FILE_NAME = "bookjournal-backup.json";

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
