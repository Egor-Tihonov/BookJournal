<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDrive } from '../../stores/drive'
import { useJournal } from '../../stores/journal'
import { useModals } from '../../stores/modals'
import { useAuth } from '../../stores/auth'
import { useSync } from '../../stores/sync'

const modals = useModals()
const journal = useJournal()
const drive = useDrive()
const auth = useAuth()
const sync = useSync()

// Кнопка возобновления синка после истёкшего токена: сначала входим, потом сразу гоним цикл синка.
const onSignInAndSync = async () => {
  await auth.signIn()
  if (!auth.error) sync.syncNow('signin')
}

// formatDate из utils форматирует только дату — для бэкапа важно ещё и время сохранения.
const lastBackupText = () => new Date(drive.lastBackupAt).toLocaleString('ru')

// Подтверждение восстановления — встроенный шаг вместо системного confirm().
const confirmingRestore = ref(false)

watch(
  () => modals.driveOpen,
  () => {
    confirmingRestore.value = false
  },
)

const onRestore = async () => {
  confirmingRestore.value = false
  const ok = await drive.restore()
  if (ok) modals.closeDrive()
}

// Закрытие по Escape (стандартное поведение модального окна).
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && modals.driveOpen) {
    modals.closeDrive()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <template v-if="modals.driveOpen">
      <div
        class="modal fade show"
        style="display: block"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        @click.self="modals.closeDrive()"
      >
        <div class="modal-dialog modal-dialog-centered bj-sheet-dialog">
          <div class="modal-content bj-sheet">
            <button class="x" type="button" aria-label="Закрыть" @click="modals.closeDrive()">
              ×
            </button>

            <h3>Google Drive</h3>
            <div class="sub">
              Резервная копия библиотеки хранится в скрытой папке приложения на вашем Google Диске.
            </div>

            <div class="sub" style="margin-top: -10px">
              <template v-if="drive.lastBackupAt">Последнее сохранение: {{ lastBackupText() }}</template>
              <template v-else>Ещё ни разу не сохранялось с этого устройства.</template>
            </div>

            <!-- Статус автосинхронизации -->
            <div class="sub" style="margin-top: -6px">
              <template v-if="!auth.signedIn">Автосинхронизация выключена — войдите в Google</template>
              <template v-else-if="sync.status === 'syncing'">Синхронизация…</template>
              <template v-else-if="sync.status === 'needAuth'">Войдите, чтобы возобновить синхронизацию</template>
              <span v-else-if="sync.status === 'error'" class="sync-error">{{ sync.error }}</span>
              <template v-else-if="sync.status === 'synced'">
                Синхронизировано: {{ new Date(sync.lastSyncAt).toLocaleString('ru') }}
              </template>
            </div>
            <div
              v-if="auth.signedIn && sync.pendingPush && sync.status !== 'syncing'"
              class="sub"
              style="margin-top: -6px"
            >
              Есть неотправленные изменения
            </div>
            <button
              v-if="auth.signedIn && sync.status === 'needAuth'"
              class="bj-btn"
              type="button"
              style="margin-top: 10px"
              @click="onSignInAndSync"
            >
              Войти и синхронизировать
            </button>
            <div v-if="auth.signedIn" class="sub" style="margin-top: -6px">
              {{
                sync.storagePersisted
                  ? 'Локальное хранилище защищено от очистки'
                  : 'Браузер может очистить локальные данные — включена синхронизация'
              }}
            </div>

            <div
              v-if="!confirmingRestore"
              style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px"
            >
              <button
                class="bj-btn"
                type="button"
                :disabled="drive.busy !== 'idle'"
                @click="drive.backup()"
              >
                {{ drive.busy === 'saving' ? 'Сохраняю…' : 'Сохранить в Drive' }}
              </button>
              <button
                class="bj-btn ghost"
                type="button"
                :disabled="drive.busy !== 'idle'"
                @click="confirmingRestore = true"
              >
                {{ drive.busy === 'restoring' ? 'Восстанавливаю…' : 'Восстановить из Drive' }}
              </button>
            </div>

            <!-- Шаг подтверждения восстановления -->
            <div
              v-else
              style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px"
            >
              <div class="confirm-text">
                Заменить текущие данные (книг: {{ journal.totalBooks }}, записей:
                {{ journal.totalEntries }}) данными из Google Drive?
              </div>
              <button class="bj-btn ghost danger" type="button" @click="onRestore">
                Да, заменить
              </button>
              <button class="bj-btn ghost" type="button" @click="confirmingRestore = false">
                Отмена
              </button>
            </div>

            <div v-if="drive.error" class="drive-error">{{ drive.error }}</div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="modals.closeDrive()"></div>
    </template>
  </Teleport>
</template>

<style scoped>
.drive-error {
  margin-top: 14px;
  font-size: 13px;
  color: #8f3b2c;
}
.sync-error {
  color: #8f3b2c;
}
.confirm-text {
  font-size: 14px;
  color: var(--ink);
  line-height: 1.45;
}
</style>
