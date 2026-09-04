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
      actionPlayerId: 'host'
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
