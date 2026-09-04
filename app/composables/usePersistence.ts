import type { GameSnapshot } from '~~/types/game'

export const PERSISTENCE_KEYS = {
  playerProfile: 'sj.player.profile.v1',
  roomSession: 'sj.room.session.v1',
  gameSnapshot: 'sj.game.snapshot.v1',
  gameEventLog: 'sj.game.eventlog.v1',
  onboarding: 'sj.ui.onboarding.v1',
  settings: 'sj.ui.settings.v1'
} as const

export interface PlayerSettings {
  schemaVersion: number
  playerInfoMode: 'hover' | 'always'
  buildingTextMode: 'compact' | 'detailed'
}

export interface OnboardingState {
  schemaVersion: number
  completed: boolean
}

export interface PersistenceChange {
  key: string
  value: unknown | null
}

export interface UsePersistenceReturn {
  load: <T>(key: string) => T | null
  save: <T>(key: string, value: T) => void
  remove: (key: string) => void
  clearAll: () => void
  subscribe: (listener: (change: PersistenceChange) => void) => () => void
}

const CURRENT_SNAPSHOT_SCHEMA = 2
const STORAGE_KEY_PATTERN = /^sj\.[a-z]+\.[a-z-]+\.v\d+$/

export function usePersistence(): UsePersistenceReturn {
  const listeners = new Set<(change: PersistenceChange) => void>()
  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('sj-room')

  function load<T>(key: string): T | null {
    if (!isStorageAvailable() || !STORAGE_KEY_PATTERN.test(key)) return null
    let raw: string | null
    try {
      raw = window.localStorage.getItem(key)
    }
    catch {
      console.warn(`Unable to read ${key} from LocalStorage.`)
      return null
    }
    if (raw === null) return null

    try {
      return migrateValue(key, JSON.parse(raw)) as T
    }
    catch {
      backupCorruptedValue(key, raw)
      window.localStorage.removeItem(key)
      return null
    }
  }

  function save<T>(key: string, value: T): void {
    if (!isStorageAvailable() || !STORAGE_KEY_PATTERN.test(key)) return

    try {
      const migratedValue = migrateValue(key, value)
      window.localStorage.setItem(key, JSON.stringify(migratedValue))
      channel?.postMessage({ key, value: migratedValue })
    }
    catch {
      console.warn(`Unable to persist ${key}. LocalStorage may be unavailable or full.`)
    }
  }

  function remove(key: string): void {
    if (!isStorageAvailable() || !STORAGE_KEY_PATTERN.test(key)) return
    window.localStorage.removeItem(key)
    channel?.postMessage({ key, value: null })
  }

  function clearAll(): void {
    if (!isStorageAvailable()) return
    for (const key of Object.values(PERSISTENCE_KEYS)) {
      window.localStorage.removeItem(key)
      channel?.postMessage({ key, value: null })
    }
  }

  function subscribe(listener: (change: PersistenceChange) => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  channel?.addEventListener('message', event => {
    const change = event.data as PersistenceChange
    if (change && typeof change.key === 'string') {
      listeners.forEach(listener => listener(change))
    }
  })

  return { load, save, remove, clearAll, subscribe }
}

export function migrateValue(key: string, value: unknown): unknown {
  if (key === PERSISTENCE_KEYS.gameSnapshot) return migrateSnapshot(value)
  if (key === PERSISTENCE_KEYS.settings) return migrateSettings(value)
  if (key === PERSISTENCE_KEYS.onboarding) return migrateOnboarding(value)
  return value
}

export function migrateSnapshot(value: unknown): GameSnapshot {
  if (!isRecord(value)
    || typeof value.schemaVersion !== 'number'
    || typeof value.gameId !== 'string'
    || typeof value.roomId !== 'string'
    || !Array.isArray(value.players)
    || !value.players.every(isValidPlayerState)
    || !Array.isArray(value.deckState)
    || !Array.isArray(value.discardState)
    || !isRecord(value.turnState)
    || !Array.isArray(value.turnState.selectedRoles)
    || !Array.isArray(value.turnState.completedPlayerIds)) {
    throw new Error('STATE_CORRUPTED')
  }

  const snapshot = structuredClone(value) as unknown as GameSnapshot
  snapshot.schemaVersion = CURRENT_SNAPSHOT_SCHEMA
  snapshot.turnState.pendingTrades = Array.isArray(snapshot.turnState.pendingTrades) ? snapshot.turnState.pendingTrades : []
  snapshot.turnState.selectedRoles = Array.isArray(snapshot.turnState.selectedRoles) ? snapshot.turnState.selectedRoles : []
  snapshot.turnState.completedPlayerIds = Array.isArray(snapshot.turnState.completedPlayerIds) ? snapshot.turnState.completedPlayerIds : []
  snapshot.turnState.priceCard ??= null
  snapshot.winner ??= null
  return snapshot
}

export function createDefaultSettings(): PlayerSettings {
  return { schemaVersion: 1, playerInfoMode: 'hover', buildingTextMode: 'detailed' }
}

export function createDefaultOnboardingState(): OnboardingState {
  return { schemaVersion: 1, completed: false }
}

function migrateSettings(value: unknown): PlayerSettings {
  const defaults = createDefaultSettings()
  if (!isRecord(value)) return defaults
  return {
    schemaVersion: 1,
    playerInfoMode: value.playerInfoMode === 'always' ? 'always' : defaults.playerInfoMode,
    buildingTextMode: value.buildingTextMode === 'compact' ? 'compact' : defaults.buildingTextMode
  }
}

function migrateOnboarding(value: unknown): OnboardingState {
  return isRecord(value) && value.completed === true
    ? { schemaVersion: 1, completed: true }
    : createDefaultOnboardingState()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidPlayerState(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.profile)) return false
  return typeof value.profile.discordId === 'string'
    && typeof value.profile.username === 'string'
    && Array.isArray(value.hand)
    && Array.isArray(value.buildings)
    && isRecord(value.goods)
}

function isStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function backupCorruptedValue(key: string, raw: string): void {
  if (!isStorageAvailable()) return
  try {
    window.localStorage.setItem(`${key}.backup.${Date.now()}`, raw)
  }
  catch {
    console.warn(`Unable to back up corrupted ${key}.`)
  }
}
