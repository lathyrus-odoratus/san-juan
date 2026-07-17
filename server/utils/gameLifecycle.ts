import type { PlayerProfile } from '~~/types/player'
import type { Room } from '~~/types/room'
import { createGameForRoom } from '~~/server/utils/gameStore'
import { assignRoomGame, startRoom } from '~~/server/utils/roomStore'

export function startGameForRoom(roomIdOrCode: string, host: PlayerProfile): Room {
  const startedRoom = startRoom(roomIdOrCode, host)
  const game = createGameForRoom(startedRoom)
  return assignRoomGame(startedRoom.roomId, game.gameId)
}
