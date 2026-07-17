import { requireAuthSession } from '~~/server/utils/authSession'
import { setPlayerReady } from '~~/server/utils/roomStore'
import { emitRoomUpdated } from '~~/server/utils/roomSocketEvents'
import type { ReadyRoomRequest } from '~~/types/room'

export default defineEventHandler(async (event) => {
  const player = await requireAuthSession(event)
  const body = await readBody<ReadyRoomRequest>(event)

  const room = setPlayerReady(getRouterParam(event, 'roomId') ?? '', player, body)
  emitRoomUpdated(room)
  return room
})
