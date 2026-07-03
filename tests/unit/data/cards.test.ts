import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface SellValue {
  min: number
  max: number
}

interface CardEffect {
  phase: string
  text: string
}

interface BuildingCard {
  id: string
  name: string
  nameZh: string
  category: 'production' | 'city'
  cost: number
  vp: number
  count: number
  goodType?: string
  sellValue?: SellValue
  tags: string[]
  effect: CardEffect | null
}

interface RoleCard {
  id: string
  name: string
  nameZh: string
  commonAction: string
  privilege: string
}

interface RulesConfig {
  schemaVersion: number
  playerCount: number
  initialHandSize: number
  handLimit: number
  towerHandLimit: number
  endgameBuildingCount: number
  goods: string[]
  guildHallScoring: string
  monuments: string[]
  expectedCardCount: {
    base: number
    expansion: number
    total: number
    pendingExpansionProduction: number
  }
}

function readJson<T>(relativePath: string): T {
  const fullPath = resolve(process.cwd(), relativePath)
  return JSON.parse(readFileSync(fullPath, 'utf-8')) as T
}

const buildings = readJson<{ schemaVersion: number, cards: BuildingCard[] }>('data/cards.buildings.json')
const rolesFile = readJson<{ schemaVersion: number, roles: RoleCard[] }>('data/cards.roles.json')
const rules = readJson<RulesConfig>('data/rules.config.json')

const cards = buildings.cards
const ALLOWED_CATEGORIES = ['production', 'city']
const ALLOWED_PHASES = [
  'round_start',
  'role_selection',
  'build',
  'produce',
  'trade',
  'council',
  'prospect',
  'game_end',
]

describe('cards.buildings.json', () => {
  it('每張牌都有 schemaVersion 與非空 cards 陣列', () => {
    expect(buildings.schemaVersion).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(cards)).toBe(true)
    expect(cards.length).toBeGreaterThan(0)
  })

  it('所有 id 皆唯一', () => {
    const ids = cards.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('必要欄位非空', () => {
    for (const card of cards) {
      expect(card.id, `id of ${card.name}`).toBeTruthy()
      expect(card.name, `name of ${card.id}`).toBeTruthy()
      expect(card.nameZh, `nameZh of ${card.id}`).toBeTruthy()
      expect(Array.isArray(card.tags), `tags of ${card.id}`).toBe(true)
      expect(card.tags.length, `tags of ${card.id}`).toBeGreaterThan(0)
    }
  })

  it('category 合法', () => {
    for (const card of cards) {
      expect(ALLOWED_CATEGORIES, card.id).toContain(card.category)
    }
  })

  it('cost 在 1..7、vp 在 0..6、count >= 1', () => {
    for (const card of cards) {
      expect(card.cost, `cost of ${card.id}`).toBeGreaterThanOrEqual(1)
      expect(card.cost, `cost of ${card.id}`).toBeLessThanOrEqual(7)
      expect(card.vp, `vp of ${card.id}`).toBeGreaterThanOrEqual(0)
      expect(card.vp, `vp of ${card.id}`).toBeLessThanOrEqual(6)
      expect(card.count, `count of ${card.id}`).toBeGreaterThanOrEqual(1)
      expect(Number.isInteger(card.count), `count of ${card.id}`).toBe(true)
    }
  })

  it('生產建築有合法 goodType 與 sellValue', () => {
    const production = cards.filter(c => c.category === 'production')
    expect(production.length).toBeGreaterThan(0)
    for (const card of production) {
      expect(rules.goods, `goodType of ${card.id}`).toContain(card.goodType)
      expect(card.sellValue, `sellValue of ${card.id}`).toBeDefined()
      const { min, max } = card.sellValue!
      expect(min, `sellValue.min of ${card.id}`).toBeGreaterThanOrEqual(1)
      expect(max, `sellValue.max of ${card.id}`).toBeGreaterThanOrEqual(min)
    }
  })

  it('城市建築的 effect 為 null 或含合法 phase + 非空 text', () => {
    const city = cards.filter(c => c.category === 'city')
    for (const card of city) {
      if (card.effect === null) continue
      expect(ALLOWED_PHASES, `effect.phase of ${card.id}`).toContain(card.effect.phase)
      expect(card.effect.text, `effect.text of ${card.id}`).toBeTruthy()
    }
  })

  it('生產建築不應帶 effect', () => {
    const production = cards.filter(c => c.category === 'production')
    for (const card of production) {
      expect(card.effect, `effect of ${card.id}`).toBeNull()
    }
  })

  it('帶 endgame_scoring tag 的建築 vp 應為 0（分數僅來自終局計分規則）', () => {
    const endgameScoring = cards.filter(c => c.tags.includes('endgame_scoring'))
    expect(endgameScoring.length).toBeGreaterThan(0)
    for (const card of endgameScoring) {
      expect(card.vp, `vp of ${card.id}`).toBe(0)
    }
  })

  it('總張數符合預期（base 110 / expansion 30 / total 140）', () => {
    const sum = (list: BuildingCard[]): number => list.reduce((acc, c) => acc + c.count, 0)
    const base = cards.filter(c => !c.tags.includes('expansion'))
    const expansion = cards.filter(c => c.tags.includes('expansion'))

    expect(sum(base)).toBe(rules.expectedCardCount.base)
    expect(sum(expansion)).toBe(rules.expectedCardCount.expansion)
    expect(sum(cards)).toBe(rules.expectedCardCount.total)
  })

  it('基底生產建築 42 張、基底城市建築 68 張', () => {
    const sum = (list: BuildingCard[]): number => list.reduce((acc, c) => acc + c.count, 0)
    const baseProduction = cards.filter(c => c.category === 'production' && !c.tags.includes('expansion'))
    const baseCity = cards.filter(c => c.category === 'city' && !c.tags.includes('expansion'))
    expect(sum(baseProduction)).toBe(42)
    expect(sum(baseCity)).toBe(68)
  })
})

describe('cards.roles.json', () => {
  it('恰有 5 張職業牌且 id 唯一', () => {
    expect(rolesFile.roles.length).toBe(5)
    const ids = rolesFile.roles.map(r => r.id)
    expect(new Set(ids).size).toBe(5)
  })

  it('每張職業牌欄位非空', () => {
    for (const role of rolesFile.roles) {
      expect(role.id).toBeTruthy()
      expect(role.name).toBeTruthy()
      expect(role.nameZh).toBeTruthy()
      expect(role.commonAction).toBeTruthy()
      expect(role.privilege).toBeTruthy()
    }
  })

  it('涵蓋全部 5 種職業', () => {
    const ids = rolesFile.roles.map(r => r.id).sort()
    expect(ids).toEqual(['builder', 'councillor', 'producer', 'prospector', 'trader'])
  })
})

describe('rules.config.json', () => {
  it('含必要規則常數且數值合理', () => {
    expect(rules.playerCount).toBe(4)
    expect(rules.initialHandSize).toBe(4)
    expect(rules.handLimit).toBe(7)
    expect(rules.towerHandLimit).toBe(12)
    expect(rules.endgameBuildingCount).toBe(12)
    expect(rules.goods).toHaveLength(5)
    expect(rules.monuments).toEqual(['statue', 'victory_column', 'hero'])
  })

  it('monuments 與 goods 都能對應到實際牌資料', () => {
    const ids = new Set(cards.map(c => c.id))
    for (const monument of rules.monuments) {
      expect(ids, `monument ${monument}`).toContain(monument)
    }
    const goodTypes = new Set(
      cards.filter(c => c.category === 'production').map(c => c.goodType),
    )
    for (const good of rules.goods) {
      expect(goodTypes, `good ${good}`).toContain(good)
    }
  })
})
