import { computed } from 'vue'
import type { Ref } from 'vue'
import type { PlayerProfile } from '~~/types/player'

export interface UseAuthReturn {
  isLoggedIn: Ref<boolean>
  player: Ref<PlayerProfile | null>
  login: () => void
  logout: () => Promise<void>
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
