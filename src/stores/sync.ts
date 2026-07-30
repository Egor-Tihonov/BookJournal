// Движок автосинхронизации с Google Drive: следит за локальными изменениями (journal.dataVersion),
// периодически проверяет файл бэкапа на Drive и сливает данные через mergeSnapshots (см. ../services/sync/merge.ts).
// Сам обмен с Drive — в services/googledrive/drive.ts, токен — в services/googledrive/auth.ts.

import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useJournal } from './journal'
import { useAuth } from './auth'
import { downloadBackup, findBackupFile, uploadBackup } from '../services/googledrive/drive'
import { AuthRequiredError, hasValidToken } from '../services/googledrive/auth'
import { mergeSnapshots, normalizeSnapshot, type Snapshot } from '../services/sync/merge'
import { SYNC_MIN_PULL_INTERVAL_MS, SYNC_PUSH_DEBOUNCE_MS } from '../config'
import type { Book, DiaryEntry, Deletion } from '../types'

const LAST_SYNC_KEY = 'bj-sync-last'
const PENDING_KEY = 'bj-sync-pending'
const REMOTE_SEEN_KEY = 'bj-sync-remote-seen'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'needAuth'

export const useSync = defineStore('sync', () => {
  // idle: синк не настроен (не вошёл); syncing: идёт цикл; synced: последний цикл прошёл успешно;
  // error: последний цикл упал с ошибкой; needAuth: вошёл, но токен истёк — нужен клик пользователя.
  const status = ref<SyncStatus>('idle')
  const error = ref('')
  const lastSyncAt = ref(localStorage.getItem(LAST_SYNC_KEY) ?? '')
  // Есть несохранённые изменения — переживает перезагрузку страницы, чтобы синк не потерял их.
  const pendingPush = ref(localStorage.getItem(PENDING_KEY) === '1')
  const storagePersisted = ref(false)

  // modifiedTime файла бэкапа, который мы уже видели (скачали или сами залили) —
  // по нему решаем, менялся ли файл на Drive с прошлого цикла.
  let lastSeenRemoteModified = localStorage.getItem(REMOTE_SEEN_KEY) ?? ''
  // true, пока применяем снимок из Drive к локальным данным — эти мутации journal
  // не считаются новыми локальными изменениями (иначе синк зациклится сам на себя).
  let applying = false
  let lastPullAt = 0
  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  // Появились ли новые локальные изменения, пока шёл цикл синка (их текущий цикл не отправил).
  let dirtiedDuringCycle = false

  function setPendingPush(value: boolean) {
    pendingPush.value = value
    localStorage.setItem(PENDING_KEY, value ? '1' : '0')
  }

  function rememberRemote(modifiedTime: string) {
    lastSeenRemoteModified = modifiedTime
    localStorage.setItem(REMOTE_SEEN_KEY, modifiedTime)
  }

  /** Сбросить память об увиденном файле Drive — следующий цикл синка перечитает его заново. */
  function forgetRemote() {
    lastSeenRemoteModified = ''
    localStorage.removeItem(REMOTE_SEEN_KEY)
  }

  const isEmptySnapshot = (s: Snapshot) =>
    s.books.length === 0 && s.entries.length === 0 && s.deletions.length === 0

  const backupPayload = (s: Snapshot) => ({
    version: 2,
    exportedAt: new Date().toISOString(),
    books: s.books,
    entries: s.entries,
    deletions: s.deletions,
  })

  /** Локальное изменение данных: пометить как несохранённое и перезапустить debounce отправки. */
  function markDirty() {
    setPendingPush(true)
    if (status.value === 'syncing') dirtiedDuringCycle = true
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => syncNow('push'), SYNC_PUSH_DEBOUNCE_MS)
  }

  /** Один цикл синхронизации: pull + merge + push. reason — только для диагностики условий запуска. */
  async function syncNow(reason: string) {
    const auth = useAuth()

    if (!auth.signedIn) {
      status.value = 'idle'
      return
    }
    if (status.value === 'syncing') return
    // При простом переключении вкладок не долбим Drive чаще раза в SYNC_MIN_PULL_INTERVAL_MS,
    // если только не висят несохранённые изменения.
    if (
      reason === 'visible' &&
      Date.now() - lastPullAt < SYNC_MIN_PULL_INTERVAL_MS &&
      !pendingPush.value
    ) {
      return
    }
    const journal = useJournal()
    status.value = 'syncing'
    dirtiedDuringCycle = false
    try {
      // Токен берётся тихо: из памяти или продлением по httpOnly-куке. Попапов тут нет —
      // если сессии больше нет, прилетит AuthRequiredError и мы попросим войти.
      const token = await auth.getToken()
      lastPullAt = Date.now()

      const localData = await journal.exportData()
      const local: Snapshot = {
        books: localData.books,
        entries: localData.entries,
        deletions: localData.deletions ?? [],
      }

      const file = await findBackupFile(token)

      if (!file) {
        // На Drive ещё ничего нет: если и локально пусто — просто фиксируем успех, отправлять нечего.
        if (!isEmptySnapshot(local)) {
          await uploadBackup(token, JSON.stringify(backupPayload(local)))
          const uploaded = await findBackupFile(token)
          if (uploaded) rememberRemote(uploaded.modifiedTime)
        }
      } else if (file.modifiedTime !== lastSeenRemoteModified) {
        // Файл на Drive менялся с прошлого раза (другим устройством или нами же) — сливаем.
        const content = await downloadBackup(token, file.id)
        const remote = normalizeSnapshot(
          JSON.parse(content) as { books: Book[]; entries: DiaryEntry[]; deletions?: Deletion[] },
        )
        const { merged, changedFromLocal, changedFromRemote } = mergeSnapshots(local, remote)

        // Если локально было пусто, а на Drive есть данные — merged совпадёт с remote,
        // это штатный случай (например, первый запуск на новом устройстве), просто применяем.
        if (changedFromLocal) {
          applying = true
          try {
            await journal.importData(backupPayload(merged))
          } finally {
            applying = false
          }
        }

        if (changedFromRemote) {
          await uploadBackup(token, JSON.stringify(backupPayload(merged)))
          const uploaded = await findBackupFile(token)
          if (uploaded) rememberRemote(uploaded.modifiedTime)
        } else {
          rememberRemote(file.modifiedTime)
        }
      } else if (pendingPush.value) {
        // Удалённое не менялось, но у нас есть несохранённое — просто отправляем.
        await uploadBackup(token, JSON.stringify(backupPayload(local)))
        const uploaded = await findBackupFile(token)
        if (uploaded) rememberRemote(uploaded.modifiedTime)
      }

      // Сбрасываем «несохранённое», только если за время цикла не появилось новых изменений
      // (иначе их отправит уже запланированный markDirty-таймер).
      if (!dirtiedDuringCycle) setPendingPush(false)
      status.value = 'synced'
      lastSyncAt.value = new Date().toISOString()
      localStorage.setItem(LAST_SYNC_KEY, lastSyncAt.value)
      error.value = ''
    } catch (e) {
      // pendingPush намеренно не сбрасываем — изменения остаются в очереди до следующей попытки.
      if (e instanceof AuthRequiredError) {
        // Сессия умерла (refresh-токен отозван/истёк) — нужен вход кликом, покажется модалка.
        status.value = 'needAuth'
        return
      }
      status.value = 'error'
      error.value = e instanceof Error ? e.message : 'Не удалось синхронизировать данные с Google Drive'
    }
  }

  async function init() {
    try {
      storagePersisted.value = (await navigator.storage?.persist?.()) ?? false
    } catch {
      storagePersisted.value = false
    }

    const journal = useJournal()
    const auth = useAuth()

    watch(
      () => journal.dataVersion,
      () => {
        if (!applying) markDirty()
      },
      // sync: колбэк срабатывает прямо в момент мутации, пока флаг applying ещё выставлен —
      // иначе применение данных из Drive могло бы посчитаться локальным изменением.
      { flush: 'sync' },
    )

    watch(
      () => auth.signedIn,
      (signedIn) => {
        if (signedIn) syncNow('signin')
        else status.value = 'idle' // вышел из аккаунта — сбрасываем needAuth/error
      },
    )

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') syncNow('visible')
    })

    // Access-токен истекает через час — раз в минуту тихо продлеваем его заранее по куке.
    // Модалка входа появится, только если продление невозможно (refresh-токен умер).
    setInterval(async () => {
      if (!auth.signedIn || status.value === 'syncing' || hasValidToken()) return
      try {
        await auth.getToken()
      } catch {
        status.value = 'needAuth'
      }
    }, 60_000)

    if (auth.signedIn) syncNow('start')
  }

  return {
    status,
    error,
    lastSyncAt,
    pendingPush,
    storagePersisted,
    init,
    markDirty,
    syncNow,
    forgetRemote,
  }
})
