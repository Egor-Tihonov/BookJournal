import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchUserInfo,
  getAccessToken,
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
  // флаг «пользователь входил» живёт дольше самого токена — токен Google истекает
  // через час, но при повторном запросе после уже данного согласия попап закрывается сам
  const signedIn = ref(localStorage.getItem(SIGNED_IN_KEY) === '1')
  const busy = ref(false)
  const error = ref('')
  const profile = ref<GoogleUserInfo | null>(loadProfile())

  /** Получить access-токен и по факту его получения пометить пользователя вошедшим. */
  async function getToken(): Promise<string> {
    const token = await getAccessToken()
    signedIn.value = true
    localStorage.setItem(SIGNED_IN_KEY, '1')
    // Дозапрашиваем профиль, пока в нём нет почты (например, старый токен был без нужных прав).
    if (!profile.value?.email) {
      try {
        profile.value = await fetchUserInfo(token)
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile.value))
      } catch {
        // профиль не критичен — без него просто не покажем почту
      }
    }
    return token
  }

  async function signIn() {
    error.value = ''
    busy.value = true
    try {
      await getToken()
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
