import { requireAuthSession } from '~~/server/utils/authSession'
import { kickPlayer } from '~~/server/utils/roomStore'
import { emitPlayerKicked } from '~~/server/utils/roomSocketEvents'

export default defineEventHandler(async (event) => {
  const host = await requireAuthSession(event)
  const roomId = getRouterParam(event, 'roomId') ?? ''
  const playerId = getRouterParam(event, 'playerId') ?? ''

  const room = kickPlayer(roomId, playerId, host)
  emitPlayerKicked(room, playerId)
  return room
})
