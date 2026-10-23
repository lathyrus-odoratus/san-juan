import { onMounted, onUnmounted, ref } from 'vue'
import type { Ref } from 'vue'
import type { ServerError } from '~~/types/events'
import type { GameLogEntry, GameResult, GameSnapshot, Role } from '~~/types/game'

export type GameLoadError = 'AUTH_ERROR' | 'GAME_ACCESS_DENIED' | 'GAME_NOT_FOUND' | 'UNKNOWN'

export interface UseGameReturn {
  snapshot: Ref<GameSnapshot | null>
  log: Ref<GameLogEntry[]>
  result: Ref<GameResult | null>
  loadError: Ref<GameLoadError | null>
  actionError: Ref<string | null>
  isLoading: Ref<boolean>
  reload: () => Promise<void>
  selectRole: (role: Role) => void
  skipAction: () => void
  build: (cardId: string, payment: string[]) => void
  produce: (buildingIds: string[]) => void
  trade: (buildingIds: string[]) => void
  council: (keptCardIds: string[], discardedCardIds: string[]) => void
  discard: (cardIds: string[]) => void
}

const ACTION_ERROR_MESSAGES: Record<string, string> = {
  ILLEGAL_ACTION: '現在不能這樣做，可能還沒輪到你，或選擇不符合規則。',
  AUTH_ERROR: '登入已失效，請重新登入。',
  GAME_ACCESS_DENIED: '你不在這局遊戲中。',
  GAME_NOT_FOUND: '找不到這局遊戲，伺服器可能重新啟動過。'
}

/**
 * Server-authoritative game state: one REST load on entry (and on reconnect),
 * then every change arrives as a `server:game_state_updated` broadcast.
 */
export function useGame(gameId: Ref<string>): UseGameReturn {
  const snapshot = ref<GameSnapshot | null>(null)
  const log = ref<GameLogEntry[]>([])
  const result = ref<GameResult | null>(null)
  const loadError = ref<GameLoadError | null>(null)
  const actionError = ref<string | null>(null)
  const isLoading = ref(true)
  const { $gameSocket } = useNuxtApp()

  async function reload(): Promise<void> {
    try {
      const state = await $fetch<GameSnapshot>(`/api/games/${gameId.value}/state`)
      applySnapshot(state)
      loadError.value = null
      if (!$gameSocket.connected) {
        $gameSocket.connect()
      }
      $gameSocket.emit('client:join_room', { roomId: state.roomId })
    }
    catch (error) {
      loadError.value = toLoadError(error)
    }
    finally {
      isLoading.value = false
    }
  }

  function applySnapshot(state: GameSnapshot): void {
    snapshot.value = state
    actionError.value = null
    void refreshLog()
    if (state.phase === 'GAME_END') {
      void refreshResult()
    }
  }

  async function refreshLog(): Promise<void> {
    try {
      log.value = await $fetch<GameLogEntry[]>(`/api/games/${gameId.value}/log`)
    }
    catch {
      // The log is informational; keep the last copy if it fails.
    }
  }

  async function refreshResult(): Promise<void> {
    try {
      result.value = await $fetch<GameResult>(`/api/games/${gameId.value}/result`)
    }
    catch {
      result.value = null
    }
  }

  function onGameStateUpdated(state: GameSnapshot): void {
    if (state.gameId === gameId.value) {
      applySnapshot(state)
    }
  }

  function onServerError(error: ServerError): void {
    actionError.value = ACTION_ERROR_MESSAGES[error.code] ?? error.message
  }

  function onReconnect(): void {
    // Broadcasts sent while disconnected are lost, so fetch the current state again.
    if (snapshot.value) {
      void reload()
    }
  }

  onMounted(() => {
    $gameSocket.on('server:game_state_updated', onGameStateUpdated)
    $gameSocket.on('server:error', onServerError)
    $gameSocket.on('connect', onReconnect)
    void reload()
  })

  onUnmounted(() => {
    $gameSocket.off('server:game_state_updated', onGameStateUpdated)
    $gameSocket.off('server:error', onServerError)
    $gameSocket.off('connect', onReconnect)
  })

  function send(): typeof $gameSocket {
    actionError.value = null
    return $gameSocket
  }

  return {
    snapshot,
    log,
    result,
    loadError,
    actionError,
    isLoading,
    reload,
    selectRole: role => send().emit('client:select_role', { gameId: gameId.value, role }),
    skipAction: () => send().emit('client:skip_action', { gameId: gameId.value }),
    build: (cardId, payment) => send().emit('client:build', { gameId: gameId.value, cardId, payment }),
    produce: buildingIds => send().emit('client:produce', { gameId: gameId.value, buildingIds }),
    trade: buildingIds => send().emit('client:trade', { gameId: gameId.value, buildingIds }),
    council: (keptCardIds, discardedCardIds) => send().emit('client:councillor_select', { gameId: gameId.value, keptCardIds, discardedCardIds }),
    discard: cardIds => send().emit('client:discard', { gameId: gameId.value, cardIds })
  }
}

function toLoadError(error: unknown): GameLoadError {
  const statusMessage = typeof error === 'object' && error !== null && 'statusMessage' in error
    ? (error as { statusMessage?: string }).statusMessage
    : undefined
  const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
    ? (error as { statusCode?: number }).statusCode
    : undefined

  if (statusCode === 401 || statusMessage === 'AUTH_ERROR') return 'AUTH_ERROR'
  if (statusMessage === 'GAME_ACCESS_DENIED') return 'GAME_ACCESS_DENIED'
  if (statusCode === 404 || statusMessage === 'GAME_NOT_FOUND') return 'GAME_NOT_FOUND'
  return 'UNKNOWN'
}
