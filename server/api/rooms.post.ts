import { requireAuthSession } from '~~/server/utils/authSession'
import { createRoomForPlayer } from '~~/server/utils/roomStore'
import { emitRoomUpdated } from '~~/server/utils/roomSocketEvents'
import type { CreateRoomRequest } from '~~/types/room'

export default defineEventHandler(async (event) => {
  const player = await requireAuthSession(event)
  const body = await readBody<Partial<CreateRoomRequest>>(event)

  const room = createRoomForPlayer(player, body)
  emitRoomUpdated(room)
  return room
})
