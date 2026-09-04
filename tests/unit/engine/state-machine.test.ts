import { describe, expect, it } from 'vitest'
import { useGameEngine } from '~~/app/composables/useGameEngine'
import type { PlayerProfile } from '~~/types/player'

function player(discordId: string): PlayerProfile {
  return {
    discordId,
    username: `player-${discordId}`,
    avatar: null
  }
}

describe('initial game state machine', () => {
  it('starts at role selection with the first player as Governor and active player', () => {
    const players: PlayerProfile[] = [player('host'), player('p1'), player('p2'), player('p3')]
    const snapshot = useGameEngine().createGame('room-seed', players)

    expect(snapshot.phase).toBe('ROUND_ROLE_SELECTION')
    expect(snapshot.turnState).toEqual({
      round: 1,
      governorPlayerId: 'host',
      activePlayerId: 'host',
      actionPlayerId: null,
      selectedRole: null,
      selectedRoles: [],
      completedPlayerIds: [],
      priceCard: null,
      pendingTrades: []
    })
    expect(snapshot.winner).toBeNull()
  })

  it('returns cloned snapshots so callers cannot mutate engine state through prior results', () => {
    const engine = useGameEngine()
    const snapshot = engine.createGame('room-seed', [player('host'), player('p1'), player('p2'), player('p3')])
    snapshot.players[0]?.hand.push('mutated_card')

    const nextSnapshot = engine.createGame('room-seed', [player('host'), player('p1'), player('p2'), player('p3')])

    expect(nextSnapshot.players[0]?.hand).not.toContain('mutated_card')
  })
})
