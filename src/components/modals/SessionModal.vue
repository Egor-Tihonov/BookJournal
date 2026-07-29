<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuth } from '../../stores/auth'
import { useSync } from '../../stores/sync'

// Токен Google живёт час. Когда он истёк, синк ставит статус needAuth —
// показываем модалку продления. Продлить можно только кликом пользователя
// (Google не отдаёт токен без жеста), отказ или закрытие = выход из аккаунта.
const auth = useAuth()
const sync = useSync()

const open = ref(false)
const busy = ref(false)
const error = ref('')

watch(
  () => sync.status,
  (s) => {
    if (s === 'needAuth' && auth.signedIn) {
      error.value = ''
      open.value = true
    }
  },
)

const renew = async () => {
  busy.value = true
  error.value = ''
  try {
    await auth.getToken()
    open.value = false
    sync.syncNow('renew')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось продлить сессию'
  } finally {
    busy.value = false
  }
}

const decline = async () => {
  open.value = false
  await auth.signOut()
}

// Закрытие по Escape — тоже отказ от продления.
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && open.value) decline()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <template v-if="open">
      <div
        class="modal fade show"
        style="display: block"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        @click.self="decline"
      >
        <div class="modal-dialog modal-dialog-centered bj-sheet-dialog">
          <div class="modal-content bj-sheet">
            <button class="x" type="button" aria-label="Закрыть" @click="decline">×</button>
            <h3>Сессия истекла</h3>
            <div class="sub">
              Google выдаёт доступ на час. Продлите сессию, чтобы синхронизация с Drive
              продолжила работать, — или выйдите из аккаунта.
            </div>
            <div class="foot" style="border: none">
              <div v-if="error" class="err">{{ error }}</div>
              <div v-else />
              <div style="display: flex; gap: 10px">
                <button class="bj-btn ghost" type="button" :disabled="busy" @click="decline">
                  Выйти
                </button>
                <button class="bj-btn" type="button" :disabled="busy" @click="renew">
                  {{ busy ? 'Подождите…' : 'Продлить' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="decline"></div>
    </template>
  </Teleport>
</template>
