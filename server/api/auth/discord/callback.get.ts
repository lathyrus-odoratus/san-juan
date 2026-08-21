import { getAuthSessionConfig } from '~~/server/utils/authSession'
import { exchangeDiscordCode } from '~~/server/utils/discord'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const query = getQuery(event)
  const code = query.code

  if (typeof code !== 'string' || !code) {
    return sendRedirect(event, '/login?error=AUTH_ERROR')
  }

  try {
    const profile = await exchangeDiscordCode(code, {
      clientId: config.discordClientId,
      clientSecret: config.discordClientSecret,
      redirectUri: config.discordRedirectUri
    })

    const session = await useSession(event, getAuthSessionConfig(event))
    await session.update(profile)

    return sendRedirect(event, '/lobby')
  }
  catch (error) {
    // Discord 回傳的失敗原因只有 server log 看得到，前端一律導回 AUTH_ERROR
    console.error('[auth] discord callback failed:', error)
    return sendRedirect(event, '/login?error=AUTH_ERROR')
  }
})
