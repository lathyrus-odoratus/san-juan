import { describe, expect, it } from 'vitest'
import { dispatchGameAction } from '~~/app/composables/useGameEngine'
import { createActionState, hostState, playerState } from './roleActionTestUtils'

describe('Councillor action', () => {
  it('keeps one of five drawn cards for the privileged player and discards the rest', () => {
    const state = createActionState('Councillor')
    const drawnCards = state.deckState.slice(0, 5)

    const snapshot = dispatchGameAction(state, {
      type: 'COUNCIL',
      playerId: 'host',
      keptCardIds: [drawnCards[2] ?? ''],
      discardedCardIds: drawnCards.filter((_, index) => index !== 2)
    })

    expect(hostState(snapshot).hand).toContain(drawnCards[2])
    expect(snapshot.discardState).toEqual(drawnCards.filter((_, index) => index !== 2))
    expect(snapshot.deckState).toHaveLength(state.deckState.length - 5)
    expect(snapshot.phase).toBe('ROUND_ACTION_RESOLUTION')
    expect(snapshot.turnState.actionPlayerId).toBe('p1')
  })

  it('rejects keeping cards that were not drawn', () => {
    const state = createActionState('Councillor')
    const drawnCards = state.deckState.slice(0, 5)

    expect(() => dispatchGameAction(state, {
      type: 'COUNCIL',
      playerId: 'host',
      keptCardIds: ['not_drawn'],
      discardedCardIds: drawnCards.slice(1)
    })).toThrow('ILLEGAL_ACTION')
  })

  it('draws two and keeps one for non-privileged players', () => {
    const state = createActionState('Councillor')
    state.turnState.actionPlayerId = 'p1'
    const drawnCards = state.deckState.slice(0, 2)

    const snapshot = dispatchGameAction(state, {
      type: 'COUNCIL',
      playerId: 'p1',
      keptCardIds: [drawnCards[0] ?? ''],
      discardedCardIds: [drawnCards[1] ?? '']
    })

    expect(playerState(snapshot, 'p1').hand).toContain(drawnCards[0])
    expect(snapshot.discardState).toEqual([drawnCards[1]])
    expect(snapshot.deckState).toHaveLength(state.deckState.length - 2)
    expect(snapshot.turnState.actionPlayerId).toBe('p2')
  })
})
