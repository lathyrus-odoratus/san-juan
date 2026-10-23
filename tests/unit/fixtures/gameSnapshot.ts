import { useGameEngine } from '~~/app/composables/useGameEngine'
import type { GameSnapshot } from '~~/types/game'
import type { PlayerProfile } from '~~/types/player'

export const VIEWER_ID = 'you'

const PROFILES: PlayerProfile[] = [
  { discordId: 'you', username: 'You', avatar: null },
  { discordId: 'alice', username: 'Alice', avatar: null },
  { discordId: 'bob', username: 'Bob', avatar: null },
  { discordId: 'carol', username: 'Carol', avatar: null }
]

/**
 * A freshly started 4-player game (fixed seed) where `you` is governor and picks first.
 */
export function createTableSnapshot(): GameSnapshot {
  const snapshot = useGameEngine().createGame('table-fixture-seed', PROFILES)
  snapshot.gameId = 'game-123'
  snapshot.roomId = 'room-123'
  snapshot.players[0]!.hand = ['smithy', 'market_stand', 'sugar_mill', 'tower']
  return snapshot
}
