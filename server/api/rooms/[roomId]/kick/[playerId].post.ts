import { requireAuthSession } from '~~/server/utils/authSession'
import { kickPlayer } from '~~/server/utils/roomStore'

export default defineEventHandler(async (event) => {
  const host = await requireAuthSession(event)
  const roomId = getRouterParam(event, 'roomId') ?? ''
  const playerId = getRouterParam(event, 'playerId') ?? ''

  return kickPlayer(roomId, playerId, host)
})
