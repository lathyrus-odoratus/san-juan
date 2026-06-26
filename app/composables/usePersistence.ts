export interface UsePersistenceReturn {
  load: <T>(key: string) => T | null
  save: <T>(key: string, value: T) => void
  remove: (key: string) => void
  clearAll: () => void
}

/**
 * LocalStorage access + schema migration pipeline.
 * Skeleton — implemented in a later branch.
 */
export function usePersistence(): UsePersistenceReturn {
  throw new Error('usePersistence: not implemented')
}
