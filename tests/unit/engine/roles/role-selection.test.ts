import { describe, expect, it } from 'vitest'
import { useGameEngine } from '~~/app/composables/useGameEngine'
import type { Role } from '~~/types/game'
import type { PlayerProfile } from '~~/types/player'

function player(discordId: string): PlayerProfile {
  return {
    discordId,
    username: `player-${discordId}`,
    avatar: null
  }
}

function createEngineWithGame(): ReturnType<typeof useGameEngine> {
  const engine = useGameEngine()
  engine.createGame('role-selection-seed', [player('host'), player('p1'), player('p2'), player('p3')])
  return engine
}

function selectAndSkip(engine: ReturnType<typeof useGameEngine>, playerId: string, role: Role): void {
  engine.dispatch({ type: 'SELECT_ROLE', playerId, role })
  engine.dispatch({ type: 'SKIP_ACTION', playerId })
}

describe('role selection flow', () => {
  it('moves from Governor role selection to role action resolution', () => {
    const engine = createEngineWithGame()
    const snapshot = engine.dispatch({ type: 'SELECT_ROLE', playerId: 'host', role: 'Builder' })

    expect(snapshot.phase).toBe('ROUND_ACTION_RESOLUTION')
    expect(snapshot.turnState.selectedRole).toBe('Builder')
    expect(snapshot.turnState.selectedRoles).toEqual([{ playerId: 'host', role: 'Builder' }])
    expect(snapshot.turnState.actionPlayerId).toBe('host')
  })

  it('returns to role selection with the next clockwise player after action resolution', () => {
    const engine = createEngineWithGame()

    selectAndSkip(engine, 'host', 'Builder')
    const snapshot = engine.dispatch({ type: 'SELECT_ROLE', playerId: 'p1', role: 'Producer' })

    expect(snapshot.phase).toBe('ROUND_ACTION_RESOLUTION')
    expect(snapshot.turnState.selectedRoles).toEqual([
      { playerId: 'host', role: 'Builder' },
      { playerId: 'p1', role: 'Producer' }
    ])
    expect(snapshot.turnState.actionPlayerId).toBe('p1')
  })

  it('rejects role selection from a non-active player', () => {
    const engine = createEngineWithGame()
    const state = engine.createGame('role-selection-seed', [player('host'), player('p1'), player('p2'), player('p3')])

    expect(engine.canDispatch({ type: 'SELECT_ROLE', playerId: 'p1', role: 'Builder' }, state)).toBe(false)
    expect(() => engine.dispatch({ type: 'SELECT_ROLE', playerId: 'p1', role: 'Builder' })).toThrow('ILLEGAL_ACTION')
  })

  it('rejects selecting an already selected role', () => {
    const engine = createEngineWithGame()
    selectAndSkip(engine, 'host', 'Builder')

    expect(() => engine.dispatch({ type: 'SELECT_ROLE', playerId: 'p1', role: 'Builder' })).toThrow('ILLEGAL_ACTION')
  })

  it('moves to round end check after all players have selected roles', () => {
    const engine = createEngineWithGame()

    selectAndSkip(engine, 'host', 'Builder')
    selectAndSkip(engine, 'p1', 'Producer')
    selectAndSkip(engine, 'p2', 'Trader')
    const selected = engine.dispatch({ type: 'SELECT_ROLE', playerId: 'p3', role: 'Prospector' })
    expect(selected.phase).toBe('ROUND_ACTION_RESOLUTION')

    const snapshot = engine.dispatch({ type: 'SKIP_ACTION', playerId: 'p3' })

    expect(snapshot.phase).toBe('ROUND_END_CHECK')
    expect(snapshot.turnState.activePlayerId).toBe('host')
    expect(snapshot.turnState.selectedRoles).toEqual([
      { playerId: 'host', role: 'Builder' },
      { playerId: 'p1', role: 'Producer' },
      { playerId: 'p2', role: 'Trader' },
      { playerId: 'p3', role: 'Prospector' }
    ])
  })

  it('rejects skipping an action outside role action resolution', () => {
    const engine = createEngineWithGame()

    expect(() => engine.dispatch({ type: 'SKIP_ACTION', playerId: 'host' })).toThrow('ILLEGAL_ACTION')
  })
})
