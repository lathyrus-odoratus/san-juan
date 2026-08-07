import { computed } from 'vue'
import type { Ref } from 'vue'
import type { PlayerProfile } from '~~/types/player'

export interface UseAuthReturn {
  isLoggedIn: Ref<boolean> // 現在有沒有登入
  player: Ref<PlayerProfile | null> // 有登入的話放 profile 沒登入 null 
  login: () => void // 包好的 login 函式，return 不使用
  logout: () => Promise<void> // 包好的 logout 函式
}

/**
 * Discord identity composable. Session lives server-side (httpOnly cookie);
 * `player` is populated by fetching `/api/users/info`.
 */
export function useAuth(): UseAuthReturn {
  const player = useState<PlayerProfile | null>('sj-auth-player', () => null)
  const isLoggedIn = computed(() => player.value !== null)

  async function fetchPlayer(): Promise<void> {
    try {
      player.value = await $fetch<PlayerProfile>('/api/users/info')
    }
    catch {
      player.value = null
    }
  }

  function login(): void {
    window.location.href = '/api/auth/discord/login'
  }

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' })
    player.value = null
  }

  if (import.meta.client && player.value === null) {
    void fetchPlayer()
  }

  return { isLoggedIn, player, login, logout }
}
