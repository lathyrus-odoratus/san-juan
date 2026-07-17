import { requireAuthSession } from '~~/server/utils/authSession'
import { startGameForRoom } from '~~/server/utils/gameLifecycle'
import { emitRoomUpdated } from '~~/server/utils/roomSocketEvents'

export default defineEventHandler(async (event) => {
  const host = await requireAuthSession(event)

  const room = startGameForRoom(getRouterParam(event, 'roomId') ?? '', host)
  emitRoomUpdated(room)
  return room
})
