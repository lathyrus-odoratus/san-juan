import { requireAuthSession } from '~~/server/utils/authSession'
import { getRoom } from '~~/server/utils/roomStore'

export default defineEventHandler(async (event) => {
  await requireAuthSession(event)

  return getRoom(getRouterParam(event, 'roomId') ?? '')
})
