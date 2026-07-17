import { requireAuthSession } from '~~/server/utils/authSession'
import { createRoomForPlayer } from '~~/server/utils/roomStore'
import type { CreateRoomRequest } from '~~/types/room'

export default defineEventHandler(async (event) => {
  const player = await requireAuthSession(event)
  const body = await readBody<Partial<CreateRoomRequest>>(event)

  return createRoomForPlayer(player, body)
})
