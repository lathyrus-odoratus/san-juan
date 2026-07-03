import { requireAuthSession } from '~~/server/utils/authSession'

export default defineEventHandler(async (event) => {
  return requireAuthSession(event)
})
