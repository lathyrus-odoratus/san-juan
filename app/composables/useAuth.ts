import type { Ref } from 'vue'
import type { PlayerProfile } from '~~/types/player'

export interface UseAuthReturn {
  isLoggedIn: Ref<boolean>
  player: Ref<PlayerProfile | null>
  login: () => void
  logout: () => Promise<void>
}

/**
 * Discord identity composable. Skeleton — implemented in feat/api-foundation.
 */
export function useAuth(): UseAuthReturn {
  throw new Error('useAuth: not implemented')
}
