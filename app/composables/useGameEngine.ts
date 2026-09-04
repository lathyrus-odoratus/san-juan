import type { GameAction, GameEngine, GameSnapshot, PlayerState } from '~~/types/game'
import type { PlayerProfile } from '~~/types/player'
import buildingsData from '~~/data/cards.buildings.json'
import rulesConfig from '~~/data/rules.config.json'

/**
 * Deterministic rule engine. Must stay decoupled from UI and LocalStorage.
 */
export function useGameEngine(): GameEngine {
  let snapshot: GameSnapshot | null = null

  return {
    createGame(seed: string, players: PlayerProfile[]): GameSnapshot {
      snapshot = createInitialGame(seed, players)
      return cloneSnapshot(snapshot)
    },
    dispatch(action: GameAction): GameSnapshot {
      if (!snapshot) {
        throw new Error('GAME_NOT_INITIALIZED')
      }

      if (!this.canDispatch(action, snapshot)) {
        throw new Error('ILLEGAL_ACTION')
      }

      throw new Error(`UNIMPLEMENTED_ACTION:${action.type}`)
    },
    canDispatch(_action: GameAction, state: GameSnapshot): boolean {
      return state.phase !== 'GAME_END'
    }
  }
}

interface BuildingCard {
  id: string
  count: number
}

interface BuildingsFile {
  cards: BuildingCard[]
}

interface RulesConfig {
  playerCount: number
  initialHandSize: number
}

const buildings = buildingsData as BuildingsFile
const rules = rulesConfig as RulesConfig
const STARTING_BUILDING_ID = 'indigo_plant'

function createInitialGame(seed: string, players: PlayerProfile[]): GameSnapshot {
  if (players.length !== rules.playerCount) {
    throw new Error('GAME_REQUIRES_FOUR_PLAYERS')
  }

  const deck = createDeck()
  removeStartingBuildings(deck, players.length)
  shuffle(deck, seed)

  const gamePlayers = players.map<PlayerState>(player => ({
    profile: { ...player },
    hand: drawCards(deck, rules.initialHandSize),
    buildings: [STARTING_BUILDING_ID],
    goods: {
      [STARTING_BUILDING_ID]: null
    }
  }))

  return {
    schemaVersion: 1,
    gameId: createDeterministicId('game', seed),
    roomId: '',
    hostPlayerId: players[0]?.discordId ?? '',
    players: gamePlayers,
    deckState: deck,
    discardState: [],
    turnState: {
      round: 1,
      governorPlayerId: gamePlayers[0]?.profile.discordId ?? '',
      activePlayerId: gamePlayers[0]?.profile.discordId ?? '',
      actionPlayerId: null,
      selectedRole: null,
      selectedRoles: [],
      completedPlayerIds: []
    },
    phase: 'ROUND_ROLE_SELECTION',
    winner: null,
    updatedAt: 0
  }
}

function createDeck(): string[] {
  return buildings.cards.flatMap(card => Array.from({ length: card.count }, () => card.id))
}

function removeStartingBuildings(deck: string[], count: number): void {
  for (let removed = 0; removed < count; removed += 1) {
    const index = deck.indexOf(STARTING_BUILDING_ID)
    if (index === -1) {
      throw new Error('STARTING_BUILDING_NOT_FOUND')
    }

    deck.splice(index, 1)
  }
}

function drawCards(deck: string[], count: number): string[] {
  const cards = deck.splice(0, count)
  if (cards.length !== count) {
    throw new Error('DECK_EXHAUSTED')
  }

  return cards
}

function shuffle(cards: string[], seed: string): void {
  const random = createSeededRandom(seed)
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = cards[index]
    const swap = cards[swapIndex]
    if (current === undefined || swap === undefined) {
      throw new Error('SHUFFLE_INDEX_OUT_OF_RANGE')
    }

    cards[index] = swap
    cards[swapIndex] = current
  }
}

function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed)
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function hashSeed(seed: string): number {
  let hash = 2166136261
  for (const character of seed) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0 || 1
}

function createDeterministicId(prefix: string, seed: string): string {
  return `${prefix}_${hashSeed(seed).toString(36)}`
}

function cloneSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return {
    ...snapshot,
    players: snapshot.players.map(player => ({
      profile: { ...player.profile },
      hand: [...player.hand],
      buildings: [...player.buildings],
      goods: { ...player.goods }
    })),
    deckState: [...snapshot.deckState],
    discardState: [...snapshot.discardState],
    turnState: {
      ...snapshot.turnState,
      selectedRoles: snapshot.turnState.selectedRoles.map(selectedRole => ({ ...selectedRole })),
      completedPlayerIds: [...snapshot.turnState.completedPlayerIds]
    }
  }
}
