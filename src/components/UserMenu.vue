<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuth } from '../stores/auth'
import ThemeToggle from './ThemeToggle.vue'

const props = defineProps<{ variant: 'side' | 'nav' }>()

const auth = useAuth()
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const toggle = () => {
  open.value = !open.value
  if (open.value) auth.error = ''
}

const onSignIn = async () => {
  await auth.signIn()
  if (!auth.error) open.value = false
}

const onSignOut = async () => {
  await auth.signOut()
  open.value = false
}

// Закрытие по клику вне компонента.
const onClickOutside = (e: MouseEvent) => {
  if (open.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

// Закрытие по Escape.
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && open.value) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div v-if="props.variant === 'side'" class="user-menu side-me" ref="rootRef">
    <button class="me" type="button" @click="toggle">
      <span class="ava">
        <template v-if="auth.signedIn && auth.profile?.email">
          {{ auth.profile.email.charAt(0).toUpperCase() }}
        </template>
        <svg
          v-else
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </span>
      <span>
        <b>{{ auth.signedIn ? (auth.profile?.email ?? 'Аккаунт Google') : 'Гость' }}</b>
        <small>{{ auth.signedIn ? 'вы вошли в Google' : 'войти в Google' }}</small>
      </span>
    </button>
    <div v-if="open" class="user-pop up">
      <template v-if="!auth.signedIn">
        <div class="hintline">Войдите, чтобы синхронизировать библиотеку с Google Drive</div>
        <button class="bj-btn" type="button" :disabled="auth.busy" @click="onSignIn">
          {{ auth.busy ? 'Подождите…' : 'Войти в Google' }}
        </button>
      </template>
      <template v-else>
        <div class="hintline">{{ auth.profile?.email ?? 'Вы вошли в Google' }}</div>
        <button class="bj-btn ghost" type="button" :disabled="auth.busy" @click="onSignOut">
          {{ auth.busy ? 'Подождите…' : 'Выйти' }}
        </button>
      </template>
      <div v-if="auth.error" class="err">{{ auth.error }}</div>
    </div>
  </div>

  <div v-else class="user-menu nav-me" ref="rootRef">
    <button type="button" :class="auth.signedIn ? 'on' : undefined" @click="toggle">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      Аккаунт
    </button>
    <div v-if="open" class="user-pop up">
      <!-- На телефоне сайдбара нет — переключатель темы живёт в меню аккаунта -->
      <ThemeToggle />
      <template v-if="!auth.signedIn">
        <div class="hintline">Войдите, чтобы синхронизировать библиотеку с Google Drive</div>
        <button class="bj-btn" type="button" :disabled="auth.busy" @click="onSignIn">
          {{ auth.busy ? 'Подождите…' : 'Войти в Google' }}
        </button>
      </template>
      <template v-else>
        <div class="hintline">{{ auth.profile?.email ?? 'Вы вошли в Google' }}</div>
        <button class="bj-btn ghost" type="button" :disabled="auth.busy" @click="onSignOut">
          {{ auth.busy ? 'Подождите…' : 'Выйти' }}
        </button>
      </template>
      <div v-if="auth.error" class="err">{{ auth.error }}</div>
    </div>
  </div>
</template>
