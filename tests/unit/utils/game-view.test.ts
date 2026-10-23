import { describe, expect, it } from 'vitest'
import { describeTurn, getGamePrompt, getHandLimit, getSeatOrder } from '~~/app/utils/gameView'
import { createTableSnapshot, VIEWER_ID } from '../fixtures/gameSnapshot'

describe('gameView', () => {
  it('rotates seats so the viewer comes first, keeping clockwise order', () => {
    const seats = getSeatOrder(createTableSnapshot(), 'bob').map(seat => seat.profile.discordId)

    expect(seats).toEqual(['bob', 'carol', 'you', 'alice'])
  })

  it('asks only the active player to select a role', () => {
    const snapshot = createTableSnapshot()

    expect(getGamePrompt(snapshot, VIEWER_ID)).toEqual({ type: 'select_role' })
    expect(getGamePrompt(snapshot, 'alice')).toEqual({ type: 'wait' })
  })

  it('gives the role owner the privileged councillor draw', () => {
    const snapshot = createTableSnapshot()
    snapshot.phase = 'ROUND_ACTION_RESOLUTION'
    snapshot.turnState.selectedRole = 'Councillor'
    snapshot.turnState.selectedRoles = [{ role: 'Councillor', playerId: VIEWER_ID }]
    snapshot.turnState.actionPlayerId = VIEWER_ID

    expect(getGamePrompt(snapshot, VIEWER_ID)).toEqual({ type: 'council', isPrivileged: true, drawCount: 5 })

    snapshot.turnState.actionPlayerId = 'alice'
    expect(getGamePrompt(snapshot, 'alice')).toEqual({ type: 'council', isPrivileged: false, drawCount: 2 })
  })

  it('raises the hand limit with a Tower', () => {
    const viewer = createTableSnapshot().players[0]!

    expect(getHandLimit(viewer)).toBe(7)
    expect(getHandLimit({ ...viewer, buildings: [...viewer.buildings, 'tower'] })).toBe(12)
  })

  it('describes whose turn it is', () => {
    const snapshot = createTableSnapshot()
    expect(describeTurn(snapshot)).toBe('輪到 You 選擇職業')

    snapshot.phase = 'ROUND_ACTION_RESOLUTION'
    snapshot.turnState.selectedRole = 'Trader'
    snapshot.turnState.actionPlayerId = 'alice'
    expect(describeTurn(snapshot)).toBe('貿易商階段：輪到 Alice')
  })
})
