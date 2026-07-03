import { afterEach, describe, expect, it, vi } from 'vitest'
import { exchangeDiscordCode } from '~~/server/utils/discord'

const credentials = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'http://localhost:3000/api/auth/discord/callback'
}

describe('exchangeDiscordCode (OAuth callback token exchange)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('成功時將 Discord token/user response 轉換為 PlayerProfile', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ access_token: 'abc123', token_type: 'Bearer' })
      .mockResolvedValueOnce({ id: 'discord-1', username: 'tester', avatar: 'avatar-hash' })
    vi.stubGlobal('$fetch', fetchMock)

    const profile = await exchangeDiscordCode('valid-code', credentials)

    expect(profile).toEqual({
      discordId: 'discord-1',
      username: 'tester',
      avatar: 'avatar-hash'
    })
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://discord.com/api/oauth2/token',
      expect.objectContaining({ method: 'POST' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://discord.com/api/users/@me',
      expect.objectContaining({ headers: { Authorization: 'Bearer abc123' } })
    )
  })

  it('token exchange 失敗時拋出錯誤，讓 callback 導回登入頁', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('invalid_grant'))
    vi.stubGlobal('$fetch', fetchMock)

    await expect(exchangeDiscordCode('invalid-code', credentials)).rejects.toThrow('invalid_grant')
  })

  it('avatar 為 null 時仍能正確轉換', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ access_token: 'abc123', token_type: 'Bearer' })
      .mockResolvedValueOnce({ id: 'discord-2', username: 'no-avatar', avatar: null })
    vi.stubGlobal('$fetch', fetchMock)

    const profile = await exchangeDiscordCode('valid-code', credentials)

    expect(profile.avatar).toBeNull()
  })
})
