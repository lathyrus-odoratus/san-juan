import { describe, expect, it } from 'vitest'
import { dispatchGameAction } from '~~/app/composables/useGameEngine'
import { createActionState, hostState, playerState } from './roleActionTestUtils'

describe('Builder action', () => {
  it('builds one card with Builder privilege discount and discards payment', () => {
    const state = createActionState('Builder')
    const host = hostState(state)
    host.hand = ['sugar_mill', 'smithy']

    const snapshot = dispatchGameAction(state, {
      type: 'BUILD',
      playerId: 'host',
      cardId: 'sugar_mill',
      payment: ['smithy']
    })

    expect(hostState(snapshot).buildings).toContain('sugar_mill')
    expect(hostState(snapshot).hand).toEqual([])
    expect(hostState(snapshot).goods.sugar_mill).toBeNull()
    expect(snapshot.discardState).toContain('smithy')
    expect(snapshot.phase).toBe('ROUND_ACTION_RESOLUTION')
    expect(snapshot.turnState.actionPlayerId).toBe('p1')
  })

  it('rejects building duplicate city buildings', () => {
    const state = createActionState('Builder')
    const host = hostState(state)
    host.hand = ['smithy']
    host.buildings = ['indigo_plant', 'smithy']

    expect(() => dispatchGameAction(state, {
      type: 'BUILD',
      playerId: 'host',
      cardId: 'smithy',
      payment: []
    })).toThrow('ILLEGAL_ACTION')
  })

  it('requires non-privileged players to pay the full cost', () => {
    const state = createActionState('Builder')
    state.turnState.actionPlayerId = 'p1'
    const player = playerState(state, 'p1')
    player.hand = ['sugar_mill', 'smithy', 'market_stand']

    const snapshot = dispatchGameAction(state, {
      type: 'BUILD',
      playerId: 'p1',
      cardId: 'sugar_mill',
      payment: ['smithy', 'market_stand']
    })

    expect(playerState(snapshot, 'p1').buildings).toContain('sugar_mill')
    expect(playerState(snapshot, 'p1').hand).toEqual([])
    expect(snapshot.turnState.actionPlayerId).toBe('p2')
  })

  it('rejects non-privileged players paying less than the full cost', () => {
    const state = createActionState('Builder')
    state.turnState.actionPlayerId = 'p1'
    playerState(state, 'p1').hand = ['sugar_mill', 'smithy']

    expect(() => dispatchGameAction(state, {
      type: 'BUILD',
      playerId: 'p1',
      cardId: 'sugar_mill',
      payment: ['smithy']
    })).toThrow('ILLEGAL_ACTION')
  })
})
