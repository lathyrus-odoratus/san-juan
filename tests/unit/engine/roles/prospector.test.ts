import { describe, expect, it } from 'vitest'
import { dispatchGameAction } from '~~/app/composables/useGameEngine'
import { createActionState, hostState } from './roleActionTestUtils'

describe('Prospector action', () => {
  it('draws one card for the privileged player and advances role flow', () => {
    const state = createActionState('Prospector')
    const beforeHandCount = hostState(state).hand.length
    const expectedCard = state.deckState[0]

    const snapshot = dispatchGameAction(state, { type: 'PROSPECT', playerId: 'host' })

    expect(hostState(snapshot).hand).toContain(expectedCard)
    expect(hostState(snapshot).hand).toHaveLength(beforeHandCount + 1)
    expect(snapshot.deckState).toHaveLength(state.deckState.length - 1)
    expect(snapshot.phase).toBe('ROUND_ROLE_SELECTION')
    expect(snapshot.turnState.activePlayerId).toBe('p1')
  })

  it('rejects prospecting outside the Prospector role action', () => {
    const state = createActionState('Builder')

    expect(() => dispatchGameAction(state, { type: 'PROSPECT', playerId: 'host' })).toThrow('ILLEGAL_ACTION')
  })
})
