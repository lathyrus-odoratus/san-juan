import { requireAuthSession } from '~~/server/utils/authSession'
import { setPlayerReady } from '~~/server/utils/roomStore'
import type { ReadyRoomRequest } from '~~/types/room'

export default defineEventHandler(async (event) => {
  const player = await requireAuthSession(event)
  const body = await readBody<ReadyRoomRequest>(event)

  return setPlayerReady(getRouterParam(event, 'roomId') ?? '', player, body)
})
