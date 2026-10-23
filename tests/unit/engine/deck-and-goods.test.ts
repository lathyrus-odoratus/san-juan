import { describe, expect, it } from 'vitest'
import { dispatchGameAction, getBuildingSlotKeys, useGameEngine } from '~~/app/composables/useGameEngine'
import type { GameSnapshot } from '~~/types/game'
import { createActionState, hostState, player, playerState } from './roles/roleActionTestUtils'

function countCards(state: GameSnapshot): number {
  return state.deckState.length
    + state.discardState.length
    + state.players.reduce((total, gamePlayer) => total
      + gamePlayer.hand.length
      + gamePlayer.buildings.length
      + Object.values(gamePlayer.goods).filter(Boolean).length, 0)
}

describe('deck refill', () => {
  it('shuffles the discard pile back under the deck when the deck runs low', () => {
    const state = createActionState('Prospector')
    state.discardState = state.deckState.slice(5)
    state.deckState = state.deckState.slice(0, 5)
    const before = countCards(state)

    const snapshot = dispatchGameAction(state, { type: 'PROSPECT', playerId: 'host' })

    expect(snapshot.discardState).toEqual([])
    expect(snapshot.deckState.length).toBe(before - countCards({ ...snapshot, deckState: [] }))
    expect(countCards(snapshot)).toBe(before)
  })

  it('refills mid-action instead of failing when a draw exceeds the deck', () => {
    const state = createActionState('Trader')
    const host = hostState(state)
    host.buildings = ['silver_smelter', 'coffee_roaster']
    host.goods = { silver_smelter: 'statue', coffee_roaster: 'chapel' }
    state.discardState = state.deckState.slice(2)
    state.deckState = state.deckState.slice(0, 2)
    const handSize = host.hand.length

    let snapshot = dispatchGameAction(state, { type: 'TRADE', playerId: 'host', buildingIds: ['silver_smelter', 'coffee_roaster'] })
    for (const playerId of ['p1', 'p2', 'p3']) {
      snapshot = dispatchGameAction(snapshot, { type: 'SKIP_ACTION', playerId })
    }

    // Price card silver 3 + coffee 3 = 6 cards, more than the 2 left in the deck.
    expect(hostState(snapshot).hand.length).toBe(handSize + 6)
  })

  it('reshuffles deterministically', () => {
    const state = createActionState('Prospector')
    state.discardState = state.deckState.slice(3)
    state.deckState = state.deckState.slice(0, 3)

    const first = dispatchGameAction(state, { type: 'PROSPECT', playerId: 'host' })
    const second = dispatchGameAction(state, { type: 'PROSPECT', playerId: 'host' })

    expect(first.deckState).toEqual(second.deckState)
  })
})

describe('building slots', () => {
  it('gives each copy of a production building its own goods slot', () => {
    expect(getBuildingSlotKeys(['indigo_plant', 'smithy', 'indigo_plant', 'indigo_plant']))
      .toEqual(['indigo_plant', 'smithy', 'indigo_plant#2', 'indigo_plant#3'])
  })

  it('opens an empty slot when a second copy is built', () => {
    const state = createActionState('Builder')
    hostState(state).hand = ['indigo_plant', 'tower']

    const snapshot = dispatchGameAction(state, { type: 'BUILD', playerId: 'host', cardId: 'indigo_plant', payment: [] })

    expect(hostState(snapshot).goods).toEqual({ 'indigo_plant': null, 'indigo_plant#2': null })
  })

  it('produces on both copies of the same factory', () => {
    const state = createActionState('Producer')
    const host = hostState(state)
    host.buildings = ['indigo_plant', 'indigo_plant']
    host.goods = { 'indigo_plant': null, 'indigo_plant#2': null }

    const snapshot = dispatchGameAction(state, { type: 'PRODUCE', playerId: 'host', buildingIds: ['indigo_plant', 'indigo_plant#2'] })

    expect(hostState(snapshot).goods['indigo_plant']).toBeTruthy()
    expect(hostState(snapshot).goods['indigo_plant#2']).toBeTruthy()
  })

  it('rejects producing on a slot the player does not own', () => {
    const state = createActionState('Producer')

    expect(() => dispatchGameAction(state, { type: 'PRODUCE', playerId: 'host', buildingIds: ['indigo_plant#2'] }))
      .toThrow('ILLEGAL_ACTION')
  })
})

describe('price cards', () => {
  it('reveals the top price card when the Trader is chosen and returns it afterwards', () => {
    const engine = useGameEngine()
    const initial = engine.createGame('price-seed', [player('host'), player('p1'), player('p2'), player('p3')])
    const topPriceCard = initial.priceDeck[0]

    let snapshot = engine.dispatch({ type: 'SELECT_ROLE', playerId: 'host', role: 'Trader' })
    expect(snapshot.turnState.priceCard).toEqual(topPriceCard)
    expect(snapshot.priceDeck).toHaveLength(4)

    for (const playerId of ['host', 'p1', 'p2', 'p3']) {
      snapshot = engine.dispatch({ type: 'SKIP_ACTION', playerId })
    }

    expect(snapshot.turnState.priceCard).toBeNull()
    expect(snapshot.priceDeck).toHaveLength(5)
    expect(snapshot.priceDeck.at(-1)).toEqual(topPriceCard)
  })
})

describe('game end timing', () => {
  it('ends the game right after the builder phase in which someone reaches 12 buildings', () => {
    const state = createActionState('Builder')
    const host = hostState(state)
    host.buildings = Array.from({ length: 11 }, () => 'indigo_plant')
    host.hand = ['smithy']
    state.turnState.selectedRoles = [{ role: 'Builder', playerId: 'host' }]

    let snapshot = dispatchGameAction(state, { type: 'BUILD', playerId: 'host', cardId: 'smithy', payment: [] })
    expect(snapshot.phase).toBe('ROUND_ACTION_RESOLUTION')

    for (const playerId of ['p1', 'p2', 'p3']) {
      snapshot = dispatchGameAction(snapshot, { type: 'SKIP_ACTION', playerId })
    }

    expect(snapshot.phase).toBe('GAME_END')
    expect(snapshot.winner).not.toBeNull()
    expect(playerState(snapshot, 'host').buildings).toHaveLength(12)
  })
})
