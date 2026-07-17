import { requireAuthSession } from '~~/server/utils/authSession'
import { listRooms } from '~~/server/utils/roomStore'
import type { RoomStatus } from '~~/types/room'

export default defineEventHandler(async (event) => {
  await requireAuthSession(event)

  const query = getQuery(event)
  const status: RoomStatus | undefined = query.status === 'waiting' || query.status === 'playing'
    ? query.status
    : undefined

  return listRooms(status)
})
