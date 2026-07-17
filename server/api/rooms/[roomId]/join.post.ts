import { requireAuthSession } from '~~/server/utils/authSession'
import { joinRoom } from '~~/server/utils/roomStore'
import { emitRoomUpdated } from '~~/server/utils/roomSocketEvents'

export default defineEventHandler(async (event) => {
  const player = await requireAuthSession(event)

  const room = joinRoom(getRouterParam(event, 'roomId') ?? '', player)
  emitRoomUpdated(room)
  return room
})
