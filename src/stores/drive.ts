import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useJournal } from './journal'
import { useAuth } from './auth'
import { downloadBackup, findBackupFile, uploadBackup } from '../services/googledrive/drive'

const LAST_BACKUP_KEY = 'bj-drive-last-backup'

export const useDrive = defineStore('drive', () => {
  const busy = ref<'idle' | 'saving' | 'restoring'>('idle')
  const error = ref('')
  const lastBackupAt = ref(localStorage.getItem(LAST_BACKUP_KEY) ?? '')

  /** Сохранить текущую библиотеку в Google Drive. */
  async function backup() {
    error.value = ''
    busy.value = 'saving'
    try {
      const journal = useJournal()
      const token = await useAuth().getToken()
      const content = JSON.stringify(journal.exportData())
      await uploadBackup(token, content)
      lastBackupAt.value = new Date().toISOString()
      localStorage.setItem(LAST_BACKUP_KEY, lastBackupAt.value)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось сохранить в Google Drive'
    } finally {
      busy.value = 'idle'
    }
  }

  /** Восстановить библиотеку из Google Drive. Возвращает true при успехе. */
  async function restore(): Promise<boolean> {
    error.value = ''
    busy.value = 'restoring'
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
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось восстановить данные из Google Drive'
      return false
    } finally {
      busy.value = 'idle'
    }
  }

  return { busy, error, lastBackupAt, backup, restore }
})
