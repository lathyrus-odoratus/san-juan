import { describe, expect, it } from 'vitest'
import { dispatchGameAction } from '~~/app/composables/useGameEngine'
import { createActionState, hostState, playerState } from './roleActionTestUtils'

describe('Trader action', () => {
  it('records pending trade and advances to the next action player before settlement', () => {
    const state = createActionState('Trader')
    const host = hostState(state)
    host.buildings = ['indigo_plant', 'sugar_mill']
    host.goods = { indigo_plant: 'chapel', sugar_mill: 'statue' }

    const snapshot = dispatchGameAction(state, {
      type: 'TRADE',
      playerId: 'host',
      buildingIds: ['indigo_plant', 'sugar_mill']
    })

    expect(hostState(snapshot).goods.indigo_plant).toBe('chapel')
    expect(hostState(snapshot).goods.sugar_mill).toBe('statue')
    expect(snapshot.discardState).toEqual([])
    expect(hostState(snapshot).hand).toEqual(host.hand)
    expect(snapshot.turnState.actionPlayerId).toBe('p1')
    expect(snapshot.turnState.pendingTrades).toEqual([{
      playerId: 'host',
      buildingIds: ['indigo_plant', 'sugar_mill']
    }])
    expect(snapshot.turnState.priceCard).toEqual({
      indigo: 1,
      sugar: 2,
      tobacco: 2,
      coffee: 3,
      silver: 3
    })
  })

  it('settles all pending trades after every player completes the Trader action', () => {
    const state = createActionState('Trader')
    const host = hostState(state)
    host.buildings = ['indigo_plant', 'sugar_mill']
    host.goods = { indigo_plant: 'chapel', sugar_mill: 'statue' }

    const pending = dispatchGameAction(state, {
      type: 'TRADE',
      playerId: 'host',
      buildingIds: ['indigo_plant', 'sugar_mill']
    })
    const p1Skipped = dispatchGameAction(pending, { type: 'SKIP_ACTION', playerId: 'p1' })
    const p2Skipped = dispatchGameAction(p1Skipped, { type: 'SKIP_ACTION', playerId: 'p2' })
    const snapshot = dispatchGameAction(p2Skipped, { type: 'SKIP_ACTION', playerId: 'p3' })

    expect(hostState(snapshot).goods.indigo_plant).toBeNull()
    expect(hostState(snapshot).goods.sugar_mill).toBeNull()
    expect(snapshot.discardState).toEqual(['chapel', 'statue'])
    expect(hostState(snapshot).hand.slice(-3)).toEqual(['market_hall', 'quarry', 'tower'])
    expect(snapshot.turnState.pendingTrades).toEqual([])
    expect(snapshot.phase).toBe('ROUND_ROLE_SELECTION')
    expect(snapshot.turnState.activePlayerId).toBe('p1')
  })

  it('rejects selling from a factory without goods', () => {
    const state = createActionState('Trader')
    hostState(state).goods.indigo_plant = null

    expect(() => dispatchGameAction(state, {
      type: 'TRADE',
      playerId: 'host',
      buildingIds: ['indigo_plant']
    })).toThrow('ILLEGAL_ACTION')
  })

  it('allows non-privileged players to sell one good', () => {
    const state = createActionState('Trader')
    state.turnState.actionPlayerId = 'p1'
    const player = playerState(state, 'p1')
    player.buildings = ['indigo_plant', 'sugar_mill']
    player.goods = { indigo_plant: 'chapel', sugar_mill: 'statue' }

    const snapshot = dispatchGameAction(state, {
      type: 'TRADE',
      playerId: 'p1',
      buildingIds: ['indigo_plant']
    })

    expect(snapshot.turnState.pendingTrades).toEqual([{
      playerId: 'p1',
      buildingIds: ['indigo_plant']
    }])
    expect(snapshot.turnState.actionPlayerId).toBe('p2')
  })

  it('rejects non-privileged players selling two goods', () => {
    const state = createActionState('Trader')
    state.turnState.actionPlayerId = 'p1'
    const player = playerState(state, 'p1')
    player.buildings = ['indigo_plant', 'sugar_mill']
    player.goods = { indigo_plant: 'chapel', sugar_mill: 'statue' }

    expect(() => dispatchGameAction(state, {
      type: 'TRADE',
      playerId: 'p1',
      buildingIds: ['indigo_plant', 'sugar_mill']
    })).toThrow('ILLEGAL_ACTION')
  })
})
