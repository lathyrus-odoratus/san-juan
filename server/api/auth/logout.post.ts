import { getAuthSessionConfig } from '~~/server/utils/authSession'

export default defineEventHandler(async (event) => {
  await clearSession(event, getAuthSessionConfig(event))
  return { success: true }
})
