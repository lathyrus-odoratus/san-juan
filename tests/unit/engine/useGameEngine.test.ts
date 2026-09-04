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

const players = [player('p1'), player('p2'), player('p3'), player('p4')]

describe('useGameEngine.createGame', () => {
  it('creates deterministic initial snapshots with the same seed', () => {
    const first = useGameEngine().createGame('seed-a', players)
    const second = useGameEngine().createGame('seed-a', players)

    expect(first.gameId).toBe(second.gameId)
    expect(first.players.map(gamePlayer => gamePlayer.hand)).toEqual(
      second.players.map(gamePlayer => gamePlayer.hand)
    )
    expect(first.deckState).toEqual(second.deckState)
  })

  it('creates different deck order for different seeds', () => {
    const first = useGameEngine().createGame('seed-a', players)
    const second = useGameEngine().createGame('seed-b', players)

    expect(first.deckState).not.toEqual(second.deckState)
  })

  it('requires exactly four players', () => {
    expect(() => useGameEngine().createGame('seed', players.slice(0, 3))).toThrow('GAME_REQUIRES_FOUR_PLAYERS')
    expect(() => useGameEngine().createGame('seed', [...players, player('p5')])).toThrow('GAME_REQUIRES_FOUR_PLAYERS')
  })

  it('initializes players with one Indigo Plant, four hand cards, and empty goods', () => {
    const snapshot = useGameEngine().createGame('seed', players)

    for (const gamePlayer of snapshot.players) {
      expect(gamePlayer.buildings).toEqual(['indigo_plant'])
      expect(gamePlayer.goods).toEqual({ indigo_plant: null })
      expect(gamePlayer.hand).toHaveLength(4)
    }
  })

  it('removes starting buildings and dealt cards from the deck', () => {
    const snapshot = useGameEngine().createGame('seed', players)

    expect(snapshot.deckState).toHaveLength(120)
    expect(snapshot.players.flatMap(gamePlayer => gamePlayer.hand)).toHaveLength(16)
  })
})
