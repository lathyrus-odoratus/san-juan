import { requireAuthSession } from '~~/server/utils/authSession'
import { joinRoom } from '~~/server/utils/roomStore'

export default defineEventHandler(async (event) => {
  const player = await requireAuthSession(event)

  return joinRoom(getRouterParam(event, 'roomId') ?? '', player)
})
