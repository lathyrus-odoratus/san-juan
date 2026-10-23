import rulesConfig from '~~/data/rules.config.json'
import { getBuildingSlotKeys } from '~~/app/composables/useGameEngine'
import { getBuildingLabel, GOOD_NAMES_ZH, ROLE_NAMES_ZH } from '~~/app/utils/gameLabels'
import type { GameSnapshot, PlayerState, PriceCard } from '~~/types/game'

/**
 * What the viewing player has to do right now, derived from the server snapshot.
 */
export type GamePrompt =
  | { type: 'select_role' }
  | { type: 'build'; isPrivileged: boolean }
  | { type: 'produce'; isPrivileged: boolean }
  | { type: 'trade'; isPrivileged: boolean }
  | { type: 'council'; isPrivileged: boolean; drawCount: number }
  | { type: 'discard'; handLimit: number }
  | { type: 'wait' }
  | { type: 'game_end' }

export interface BuildingSlot {
  slotKey: string
  cardId: string
  isProduction: boolean
  goodType: keyof PriceCard | null
  good: string | null
}

export function findPlayer(snapshot: GameSnapshot, playerId: string): PlayerState | null {
  return snapshot.players.find(player => player.profile.discordId === playerId) ?? null
}

/**
 * Players in clockwise order starting with the viewer, so the viewer always sits at the bottom.
 */
export function getSeatOrder(snapshot: GameSnapshot, viewerId: string): PlayerState[] {
  const viewerIndex = snapshot.players.findIndex(player => player.profile.discordId === viewerId)
  if (viewerIndex === -1) {
    return [...snapshot.players]
  }

  return [...snapshot.players.slice(viewerIndex), ...snapshot.players.slice(0, viewerIndex)]
}

export function getHandLimit(player: PlayerState): number {
  return player.buildings.includes('tower') ? rulesConfig.towerHandLimit : rulesConfig.handLimit
}

export function isRolePrivileged(snapshot: GameSnapshot, playerId: string): boolean {
  const role = snapshot.turnState.selectedRole
  return snapshot.turnState.selectedRoles.some(selected => selected.role === role && selected.playerId === playerId)
}

export function getBuildingSlots(player: PlayerState): BuildingSlot[] {
  const slotKeys = getBuildingSlotKeys(player.buildings)
  return player.buildings.map((cardId, index) => {
    const slotKey = slotKeys[index] ?? cardId
    const label = getBuildingLabel(cardId)
    return {
      slotKey,
      cardId,
      isProduction: label?.category === 'production',
      goodType: label?.goodType ?? null,
      good: player.goods[slotKey] ?? null
    }
  })
}

export function getGamePrompt(snapshot: GameSnapshot, viewerId: string): GamePrompt {
  const { phase, turnState } = snapshot
  if (phase === 'GAME_END') {
    return { type: 'game_end' }
  }

  if (phase === 'ROUND_ROLE_SELECTION') {
    return turnState.activePlayerId === viewerId ? { type: 'select_role' } : { type: 'wait' }
  }

  const viewer = findPlayer(snapshot, viewerId)
  if (!viewer || turnState.actionPlayerId !== viewerId) {
    return { type: 'wait' }
  }

  if (phase === 'ROUND_END_CHECK') {
    return { type: 'discard', handLimit: getHandLimit(viewer) }
  }

  const isPrivileged = isRolePrivileged(snapshot, viewerId)
  switch (turnState.selectedRole) {
    case 'Builder':
      return { type: 'build', isPrivileged }
    case 'Producer':
      return { type: 'produce', isPrivileged }
    case 'Trader':
      return { type: 'trade', isPrivileged }
    case 'Councillor':
      return { type: 'council', isPrivileged, drawCount: isPrivileged ? 5 : 2 }
    default:
      // The Prospector draw is resolved by the server as soon as the role is selected.
      return { type: 'wait' }
  }
}

/**
 * Changes whenever a new decision is asked of someone; used to reset modal state.
 */
export function getPromptKey(snapshot: GameSnapshot): string {
  const { turnState } = snapshot
  return [snapshot.phase, turnState.round, turnState.selectedRoles.length, turnState.selectedRole, turnState.actionPlayerId, turnState.activePlayerId].join(':')
}

export function describeTurn(snapshot: GameSnapshot): string {
  const name = (playerId: string | null): string => (playerId && findPlayer(snapshot, playerId)?.profile.username) || '玩家'
  const { phase, turnState } = snapshot

  if (phase === 'GAME_END') {
    return '遊戲結束'
  }

  if (phase === 'ROUND_ROLE_SELECTION') {
    return `輪到 ${name(turnState.activePlayerId)} 選擇職業`
  }

  if (phase === 'ROUND_END_CHECK') {
    return `${name(turnState.actionPlayerId)} 手牌超過上限，正在棄牌`
  }

  const role = turnState.selectedRole ? ROLE_NAMES_ZH[turnState.selectedRole] : ''
  return `${role}階段：輪到 ${name(turnState.actionPlayerId)}`
}

export function formatPriceCard(priceCard: PriceCard | null): string {
  if (!priceCard) {
    return '未翻開'
  }

  return (Object.keys(GOOD_NAMES_ZH) as (keyof PriceCard)[])
    .map(good => `${GOOD_NAMES_ZH[good]} ${priceCard[good]}`)
    .join(' · ')
}
