import { requireAuthSession } from '~~/server/utils/authSession'
import { getGameState } from '~~/server/utils/gameStore'

export default defineEventHandler(async (event) => {
  const player = await requireAuthSession(event)
  return getGameState(getRouterParam(event, 'gameId') ?? '', player)
})
