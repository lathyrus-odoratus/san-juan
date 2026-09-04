import { describe, expect, it } from 'vitest'
import { dispatchGameAction } from '~~/app/composables/useGameEngine'
import { createActionState, hostState } from './roleActionTestUtils'

describe('Discard action', () => {
  it('discards excess cards during round end check and starts the next round', () => {
    const state = createActionState('Builder')
    const host = hostState(state)
    host.hand = ['smithy', 'market_stand', 'well', 'black_market', 'trading_post', 'poor_house', 'crane', 'tower', 'quarry']
    state.phase = 'ROUND_END_CHECK'
    state.turnState.selectedRole = null
    state.turnState.actionPlayerId = 'host'
    state.turnState.activePlayerId = 'host'

    const snapshot = dispatchGameAction(state, {
      type: 'DISCARD',
      playerId: 'host',
      cardIds: ['tower', 'quarry']
    })

    expect(hostState(snapshot).hand).toHaveLength(7)
    expect(snapshot.discardState).toEqual(['tower', 'quarry'])
    expect(snapshot.phase).toBe('ROUND_ROLE_SELECTION')
    expect(snapshot.turnState.round).toBe(2)
    expect(snapshot.turnState.governorPlayerId).toBe('p1')
  })

  it('rejects discarding too few cards during hand limit cleanup', () => {
    const state = createActionState('Builder')
    hostState(state).hand = ['smithy', 'market_stand', 'well', 'black_market', 'trading_post', 'poor_house', 'crane', 'tower']
    state.phase = 'ROUND_END_CHECK'
    state.turnState.actionPlayerId = 'host'

    expect(() => dispatchGameAction(state, {
      type: 'DISCARD',
      playerId: 'host',
      cardIds: []
    })).toThrow('ILLEGAL_ACTION')
  })
})
