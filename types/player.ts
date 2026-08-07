// Player identity types (Discord profile)

/**
 * Minimal player identity obtained from Discord OAuth2 (`identify` scope).
 */
export interface PlayerProfile {
  discordId: string
  username: string
  avatar: string | null // 頭像
}
