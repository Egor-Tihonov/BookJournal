import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchUserInfo,
  getAccessToken,
  interactiveSignIn,
  revokeAccess,
  type GoogleUserInfo,
} from '../services/googledrive/auth'

const SIGNED_IN_KEY = 'bj-google-signed-in'
const PROFILE_KEY = 'bj-google-profile'

/** Читает профиль из localStorage, битые данные просто игнорируются. */
function loadProfile(): GoogleUserInfo | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as GoogleUserInfo) : null
  } catch {
    return null
  }
}

export const useAuth = defineStore('auth', () => {
  // флаг «пользователь входил» живёт дольше access-токена: сам токен держится в памяти
  // вкладки, а после перезагрузки тихо восстанавливается по httpOnly-куке с refresh-токеном
  const signedIn = ref(localStorage.getItem(SIGNED_IN_KEY) === '1')
  const busy = ref(false)
  const error = ref('')
  const profile = ref<GoogleUserInfo | null>(loadProfile())

  /** Пометить пользователя вошедшим и дозапросить профиль, пока в нём нет почты. */
  async function markSignedIn(token: string) {
    signedIn.value = true
    localStorage.setItem(SIGNED_IN_KEY, '1')
    if (!profile.value?.email) {
      try {
        profile.value = await fetchUserInfo(token)
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile.value))
      } catch {
        // профиль не критичен — без него просто не покажем почту
      }
    }
  }

  /** Тихо получить access-токен (память или refresh по куке). Попапов не открывает —
      если сессии нет, бросает AuthRequiredError, тогда нужен signIn() по клику. */
  async function getToken(): Promise<string> {
    const token = await getAccessToken()
    await markSignedIn(token)
    return token
  }

  /** Интерактивный вход: GIS-попап -> код -> обмен на токены в Worker. Только по клику. */
  async function signIn() {
    error.value = ''
    busy.value = true
    try {
      const token = await interactiveSignIn()
      await markSignedIn(token)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось войти в Google'
    } finally {
      busy.value = false
    }
  }

  async function signOut() {
    error.value = ''
    busy.value = true
    try {
      await revokeAccess()
    } catch {
      // игнорируем — локально всё равно выходим
    } finally {
      signedIn.value = false
      localStorage.removeItem(SIGNED_IN_KEY)
      profile.value = null
      localStorage.removeItem(PROFILE_KEY)
      busy.value = false
    }
  }

  return { signedIn, busy, error, profile, getToken, signIn, signOut }
})
