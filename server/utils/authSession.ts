import type { H3Event, SessionConfig } from 'h3'
import type { PlayerProfile } from '~~/types/player'

const SESSION_COOKIE_NAME = 'sj_session'

export function getAuthSessionConfig(event: H3Event): SessionConfig {
  const config = useRuntimeConfig(event)
  return {
    password: config.sessionSecret,
    name: SESSION_COOKIE_NAME,
    cookie: { sameSite: 'lax' }
  }
}

export async function getAuthSession(event: H3Event): Promise<PlayerProfile | null> {
  const session = await getSession<PlayerProfile>(event, getAuthSessionConfig(event))
  return session.data?.discordId ? session.data : null
}

export async function requireAuthSession(event: H3Event): Promise<PlayerProfile> {
  const profile = await getAuthSession(event)
  if (!profile) {
    throw createError({ statusCode: 401, statusMessage: 'AUTH_ERROR' })
  }
  return profile
}
