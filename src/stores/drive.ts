import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useJournal } from './journal'
import { useAuth } from './auth'
import { useSync } from './sync'
import { downloadBackup, findBackupFile } from '../services/googledrive/drive'

// Ручной остался только аварийный сценарий — восстановление (полная замена локальных данных).
// Отправка в Drive теперь целиком на автосинхронизации (см. stores/sync.ts).
export const useDrive = defineStore('drive', () => {
  const busy = ref(false)
  const error = ref('')

  /** Восстановить библиотеку из Google Drive. Возвращает true при успехе. */
  async function restore(): Promise<boolean> {
    error.value = ''
    busy.value = true
    try {
      const journal = useJournal()
      const token = await useAuth().getToken()
      const file = await findBackupFile(token)
      if (!file) {
        error.value = 'В Google Drive ещё нет сохранённых данных'
        return false
      }
      const content = await downloadBackup(token, file.id)
      await journal.importData(JSON.parse(content))
      // Данные только что заменены вручную из этого же файла — забываем modifiedTime,
      // чтобы следующий цикл автосинхронизации перепроверил файл, а не счёл его уже виденным.
      useSync().forgetRemote()
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось восстановить данные из Google Drive'
      return false
    } finally {
      busy.value = false
    }
  }

  return { busy, error, restore }
})
