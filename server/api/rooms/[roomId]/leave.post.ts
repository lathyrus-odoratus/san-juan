import { requireAuthSession } from '~~/server/utils/authSession'
import { leaveRoom } from '~~/server/utils/roomStore'
import { emitRoomClosed, emitRoomUpdated } from '~~/server/utils/roomSocketEvents'

export default defineEventHandler(async (event) => {
  const player = await requireAuthSession(event)

  const room = leaveRoom(getRouterParam(event, 'roomId') ?? '', player)
  if (room.status === 'closed') {
    emitRoomClosed(room.roomId)
  }
  else {
    emitRoomUpdated(room)
  }
  return room
})
