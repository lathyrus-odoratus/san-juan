import { beforeEach, describe, expect, it } from 'vitest'
import { migrateSnapshot, PERSISTENCE_KEYS, usePersistence } from '~~/app/composables/usePersistence'
import type { GameSnapshot } from '~~/types/game'

function legacySnapshot(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    gameId: 'game-1',
    roomId: 'room-1',
    hostPlayerId: 'p1',
    players: [],
    deckState: [],
    discardState: [],
    turnState: {
      round: 1,
      governorPlayerId: 'p1',
      activePlayerId: 'p1',
      actionPlayerId: null,
      selectedRole: null,
      selectedRoles: [],
      completedPlayerIds: [],
      priceCard: null
    },
    phase: 'ROUND_ROLE_SELECTION',
    winner: null,
    updatedAt: 1
  }
}

describe('usePersistence', () => {
  beforeEach(() => window.localStorage.clear())

  it('migrates v1 snapshots with missing fields', () => {
    const migrated = migrateSnapshot(legacySnapshot())
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.turnState.pendingTrades).toEqual([])
  })

  it('backs up corrupted JSON and returns null', () => {
    window.localStorage.setItem(PERSISTENCE_KEYS.gameSnapshot, '{broken')
    const value = usePersistence().load<GameSnapshot>(PERSISTENCE_KEYS.gameSnapshot)
    expect(value).toBeNull()
    expect(window.localStorage.getItem(PERSISTENCE_KEYS.gameSnapshot)).toBeNull()
    expect(Object.keys(window.localStorage)).toEqual(expect.arrayContaining([
      expect.stringMatching(`${PERSISTENCE_KEYS.gameSnapshot}\\.backup\\.`)
    ]))
  })

  it('saves and loads settings with defaults for unknown values', () => {
    const persistence = usePersistence()
    persistence.save(PERSISTENCE_KEYS.settings, { playerInfoMode: 'always' })
    expect(persistence.load(PERSISTENCE_KEYS.settings)).toEqual({
      schemaVersion: 1,
      playerInfoMode: 'always',
      buildingTextMode: 'detailed'
    })
  })

})
