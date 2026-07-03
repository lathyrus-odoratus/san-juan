export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const params = new URLSearchParams({
    client_id: config.discordClientId,
    redirect_uri: config.discordRedirectUri,
    response_type: 'code',
    scope: 'identify'
  })

  return sendRedirect(event, `https://discord.com/api/oauth2/authorize?${params.toString()}`)
})
