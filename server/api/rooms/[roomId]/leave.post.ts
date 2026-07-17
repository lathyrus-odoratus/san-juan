import { requireAuthSession } from '~~/server/utils/authSession'
import { leaveRoom } from '~~/server/utils/roomStore'

export default defineEventHandler(async (event) => {
  const player = await requireAuthSession(event)

  return leaveRoom(getRouterParam(event, 'roomId') ?? '', player)
})
