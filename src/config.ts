/** Конфигурация приложения — все настраиваемые значения в одном месте. */

// OAuth Client ID приложения в Google Cloud (публичное значение, не секрет)
export const GOOGLE_CLIENT_ID = "782838705901-n4mi50qjqum15bbu21jq59gko3rj61dn.apps.googleusercontent.com";

// Имя файла бэкапа в скрытой папке приложения на Google Drive
export const BACKUP_FILE_NAME = "bookjournal-backup.json";

// Пауза после последнего изменения данных перед автоотправкой в Drive
export const SYNC_PUSH_DEBOUNCE_MS = 8_000;

// Не проверять Drive чаще, чем раз в столько мс (защита от частых pull при переключении вкладок)
export const SYNC_MIN_PULL_INTERVAL_MS = 30_000;

// Сколько дней хранить события удаления (надгробия) для слияния между устройствами
export const TOMBSTONE_TTL_DAYS = 90;

// Сколько книг показывает полка на главной и карусель «Читаю»
export const SHELF_PAGE_SIZE = 6;

// Порция книг на странице «все книги статуса»
export const SHELF_FULL_PAGE_SIZE = 12;
