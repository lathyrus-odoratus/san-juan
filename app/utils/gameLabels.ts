import buildingsData from '~~/data/cards.buildings.json'
import type { PriceCard, Role } from '~~/types/game'

interface BuildingLabel {
  id: string
  name: string
  nameZh: string
  category: 'production' | 'city'
  cost: number
  vp: number
  goodType?: keyof PriceCard
}

const buildingById = new Map((buildingsData as { cards: BuildingLabel[] }).cards.map(card => [card.id, card]))

// Chinese role names follow the glossary, not the second-edition wording in cards.roles.json.
export const ROLE_NAMES_ZH: Record<Role, string> = {
  Prospector: '礦工',
  Councillor: '議員',
  Trader: '貿易商',
  Builder: '建築師',
  Producer: '製造商'
}

export const GOOD_NAMES_ZH: Record<keyof PriceCard, string> = {
  indigo: '染料',
  sugar: '糖',
  tobacco: '菸草',
  coffee: '咖啡',
  silver: '白銀'
}

export function getBuildingLabel(cardId: string): BuildingLabel | null {
  return buildingById.get(cardId.split('#')[0] ?? cardId) ?? null
}

export function getBuildingName(cardId: string): string {
  const card = getBuildingLabel(cardId)
  return card ? `${card.nameZh} ${card.name}` : cardId
}
