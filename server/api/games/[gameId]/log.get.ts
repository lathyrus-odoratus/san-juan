import { requireAuthSession } from '~~/server/utils/authSession'
import { getGameLog } from '~~/server/utils/gameStore'

export default defineEventHandler(async (event) => {
  const player = await requireAuthSession(event)
  return getGameLog(getRouterParam(event, 'gameId') ?? '', player)
})
