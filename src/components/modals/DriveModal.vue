<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDrive } from '../../stores/drive'
import { useJournal } from '../../stores/journal'
import { useModals } from '../../stores/modals'

const modals = useModals()
const journal = useJournal()
const drive = useDrive()

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
.confirm-text {
  font-size: 14px;
  color: var(--ink);
  line-height: 1.45;
}
</style>
