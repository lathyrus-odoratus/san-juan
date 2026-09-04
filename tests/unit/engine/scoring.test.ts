import { describe, expect, it } from 'vitest'
import { calculateGameResult, calculatePlayerScore } from '~~/app/composables/useGameEngine'
import type { GameSnapshot, PlayerState } from '~~/types/game'

function player(buildings: string[], hand: string[] = [], goods: Record<string, string | null> = {}): PlayerState {
  return {
    profile: { discordId: 'p1', username: 'Player', avatar: null },
    hand,
    buildings,
    goods
  }
}

function snapshot(players: PlayerState[]): GameSnapshot {
  return {
    schemaVersion: 1,
    gameId: 'game-1',
    roomId: 'room-1',
    hostPlayerId: 'p1',
    players,
    deckState: [],
    discardState: [],
    turnState: {
      round: 1,
      governorPlayerId: 'p1',
      activePlayerId: 'p1',
      actionPlayerId: null,
      selectedRole: null,
      selectedRoles: [],
      completedPlayerIds: [],
      priceCard: null,
      pendingTrades: []
    },
    phase: 'GAME_END',
    winner: null,
    updatedAt: 1
  }
}

describe('game scoring', () => {
  it('calculates base and large building bonuses', () => {
    expect(calculatePlayerScore(player([
      'indigo_plant', 'sugar_mill', 'city_hall', 'guild_hall', 'palace', 'triumphal_arch', 'statue', 'victory_column', 'hero'
    ]))).toBe(36)
  })

  it('uses hand and goods count as the tie breaker', () => {
    const result = calculateGameResult(snapshot([
      player(['indigo_plant'], ['a', 'b'], { indigo_plant: 'good' }),
      { ...player(['indigo_plant'], ['a']), profile: { discordId: 'p2', username: 'Player 2', avatar: null } }
    ]))

    expect(result.winner).toBe('p1')
    expect(result.players.find(item => item.playerId === 'p1')?.isWinner).toBe(true)
  })
})
