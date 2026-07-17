import { requireAuthSession } from '~~/server/utils/authSession'
import { getGameResult } from '~~/server/utils/gameStore'

export default defineEventHandler(async (event) => {
  const player = await requireAuthSession(event)
  return getGameResult(getRouterParam(event, 'gameId') ?? '', player)
})
