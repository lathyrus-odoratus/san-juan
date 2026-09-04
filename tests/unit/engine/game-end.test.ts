import { describe, expect, it } from 'vitest'
import { dispatchGameAction } from '~~/app/composables/useGameEngine'
import { createActionState } from './roles/roleActionTestUtils'

describe('game end transition', () => {
  it('enters GAME_END after the round finishes when a player reaches 12 buildings', () => {
    const state = createActionState('Builder')
    state.players[0]!.buildings = Array.from({ length: 12 }, (_, index) => index === 0 ? 'indigo_plant' : index === 1 ? 'hero' : `building-${index}`)
    state.players[0]!.hand = []
    state.turnState.selectedRole = 'Builder'
    state.turnState.selectedRoles = [
      { role: 'Builder', playerId: 'host' },
      { role: 'Producer', playerId: 'p1' },
      { role: 'Trader', playerId: 'p2' },
      { role: 'Councillor', playerId: 'p3' }
    ]
    state.turnState.actionPlayerId = 'host'
    state.turnState.activePlayerId = 'host'
    state.turnState.completedPlayerIds = ['p1', 'p2', 'p3']

    const nextState = dispatchGameAction(state, { type: 'SKIP_ACTION', playerId: 'host' })

    expect(nextState.phase).toBe('GAME_END')
    expect(nextState.winner).toBe('host')
  })
})
