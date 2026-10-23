import { useGameEngine } from '~~/app/composables/useGameEngine'
import type { GameSnapshot, Role } from '~~/types/game'
import type { PlayerProfile } from '~~/types/player'

export function player(discordId: string): PlayerProfile {
  return {
    discordId,
    username: `player-${discordId}`,
    avatar: null
  }
}

export function createActionState(role: Role): GameSnapshot {
  const snapshot = useGameEngine().createGame('role-action-seed', [
    player('host'),
    player('p1'),
    player('p2'),
    player('p3')
  ])

  return {
    ...snapshot,
    phase: 'ROUND_ACTION_RESOLUTION',
    deckState: [
      'market_hall',
      'quarry',
      'tower',
      'archive',
      'prefecture',
      'chapel',
      'statue',
      ...snapshot.deckState
    ],
    turnState: {
      ...snapshot.turnState,
      selectedRole: role,
      selectedRoles: [{ role, playerId: 'host' }],
      activePlayerId: 'host',
      actionPlayerId: 'host',
      // SELECT_ROLE would reveal a price card; fix one so settlement is predictable.
      priceCard: role === 'Trader'
        ? { indigo: 1, sugar: 2, tobacco: 2, coffee: 3, silver: 3 }
        : snapshot.turnState.priceCard
    }
  }
}

export function hostState(state: GameSnapshot): NonNullable<GameSnapshot['players'][number]> {
  return playerState(state, 'host')
}

export function playerState(state: GameSnapshot, playerId: string): NonNullable<GameSnapshot['players'][number]> {
  const player = state.players.find(playerState => playerState.profile.discordId === playerId)
  if (!player) {
    throw new Error(`${playerId} not found`)
  }

  return player
}
