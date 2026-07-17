import { requireAuthSession } from '~~/server/utils/authSession'
import { startRoom } from '~~/server/utils/roomStore'

export default defineEventHandler(async (event) => {
  const host = await requireAuthSession(event)

  return startRoom(getRouterParam(event, 'roomId') ?? '', host)
})
