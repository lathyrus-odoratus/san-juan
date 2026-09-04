import { describe, expect, it } from 'vitest'
import { dispatchGameAction } from '~~/app/composables/useGameEngine'
import { createActionState, hostState, playerState } from './roleActionTestUtils'

describe('Producer action', () => {
  it('produces goods on selected empty production buildings', () => {
    const state = createActionState('Producer')
    const host = hostState(state)
    host.buildings = ['indigo_plant', 'sugar_mill']
    host.goods = { indigo_plant: null, sugar_mill: null }

    const snapshot = dispatchGameAction(state, {
      type: 'PRODUCE',
      playerId: 'host',
      buildingIds: ['indigo_plant', 'sugar_mill']
    })

    expect(hostState(snapshot).goods.indigo_plant).toBe('market_hall')
    expect(hostState(snapshot).goods.sugar_mill).toBe('quarry')
    expect(snapshot.deckState).toHaveLength(state.deckState.length - 2)
    expect(snapshot.phase).toBe('ROUND_ACTION_RESOLUTION')
    expect(snapshot.turnState.actionPlayerId).toBe('p1')
  })

  it('rejects producing on a building that already has goods', () => {
    const state = createActionState('Producer')
    hostState(state).goods.indigo_plant = 'market_hall'

    expect(() => dispatchGameAction(state, {
      type: 'PRODUCE',
      playerId: 'host',
      buildingIds: ['indigo_plant']
    })).toThrow('ILLEGAL_ACTION')
  })

  it('allows non-privileged players to produce one good', () => {
    const state = createActionState('Producer')
    state.turnState.actionPlayerId = 'p1'
    const player = playerState(state, 'p1')
    player.buildings = ['indigo_plant', 'sugar_mill']
    player.goods = { indigo_plant: null, sugar_mill: null }

    const snapshot = dispatchGameAction(state, {
      type: 'PRODUCE',
      playerId: 'p1',
      buildingIds: ['indigo_plant']
    })

    expect(playerState(snapshot, 'p1').goods.indigo_plant).toBe('market_hall')
    expect(snapshot.turnState.actionPlayerId).toBe('p2')
  })

  it('rejects non-privileged players producing two goods', () => {
    const state = createActionState('Producer')
    state.turnState.actionPlayerId = 'p1'
    const player = playerState(state, 'p1')
    player.buildings = ['indigo_plant', 'sugar_mill']
    player.goods = { indigo_plant: null, sugar_mill: null }

    expect(() => dispatchGameAction(state, {
      type: 'PRODUCE',
      playerId: 'p1',
      buildingIds: ['indigo_plant', 'sugar_mill']
    })).toThrow('ILLEGAL_ACTION')
  })
})
