import type { PlayerProfile } from '~~/types/player'

interface DiscordTokenResponse {
  access_token: string
  token_type: string
}

interface DiscordUserResponse {
  id: string
  username: string
  avatar: string | null
}

interface DiscordOAuthCredentials {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export async function exchangeDiscordCode(
  code: string,
  credentials: DiscordOAuthCredentials
): Promise<PlayerProfile> {
  const tokenResponse = await $fetch<DiscordTokenResponse>('https://discord.com/api/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: credentials.redirectUri
    }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })

  const discordUser = await $fetch<DiscordUserResponse>('https://discord.com/api/users/@me', {
    headers: { Authorization: `${tokenResponse.token_type} ${tokenResponse.access_token}` }
  })

  return {
    discordId: discordUser.id,
    username: discordUser.username,
    avatar: discordUser.avatar
  }
}
